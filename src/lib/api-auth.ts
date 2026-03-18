import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getActiveOrgId } from './get-active-org'

/**
 * Утилита для проверки авторизации и features в API routes
 */

export interface AuthCheckResult {
  user: any
  email: string
  org_id: string      // activeOrgId — активный филиал (используется для всех запросов данных)
  mainOrgId: string   // основная org из org_users (для branch-validation)
  organization: any
  isAdmin: boolean
}

export async function getSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

/**
 * Проверяет авторизацию и получает данные пользователя + организации.
 *
 * Branch-aware: org_id в результате — это активный филиал пользователя
 * (из user_active_branch), а не всегда главная org. Это гарантирует что
 * платежи, SMS и другие данные записываются в нужный филиал.
 *
 * mainOrgId — всегда основная org из org_users (нужен для проверки
 * принадлежности филиала и cross-org проверок).
 */
export async function checkAuth(): Promise<
  | { success: true; data: AuthCheckResult }
  | { success: false; response: NextResponse }
> {
  const supabase = await getSupabaseServerClient()

  // 1. Проверка пользователя
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const user = userData.user
  const email = user.email || ''

  // 2. Проверка админа
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('email')
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = !!adminUser

  // 3. Получение mainOrgId из org_users (источник истины для главной org)
  const { data: orgUser, error: orgError } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!isAdmin && (orgError || !orgUser?.org_id)) {
    return {
      success: false,
      response: NextResponse.json({ error: 'No organization access' }, { status: 403 }),
    }
  }

  const mainOrgId = orgUser?.org_id || ''

  // 4. Branch-aware: получаем активный филиал из user_active_branch.
  //    getActiveOrgId() сам валидирует что значение принадлежит mainOrgId
  //    или его легитимным филиалам (защита от подделки записи).
  const org_id = isAdmin ? mainOrgId : await getActiveOrgId(user.id, mainOrgId)

  // 5. Получение данных организации (если не админ)
  let organization = null
  if (!isAdmin && org_id) {
    const { data: orgData, error: orgDataError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', org_id)
      .single()

    if (orgDataError || !orgData) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        ),
      }
    }

    organization = orgData

    // 6. Проверка активности организации
    if (!orgData.is_active) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'ארגון חסום. אנא צור קשר עם התמיכה' },
          { status: 403 }
        ),
      }
    }
  }

  return {
    success: true,
    data: {
      user: userData.user,
      email,
      org_id,
      mainOrgId,
      organization,
      isAdmin,
    },
  }
}

/**
 * Проверяет доступность фичи для организации
 */
export function checkFeature(
  organization: any,
  featureName: 'sms' | 'payments' | 'analytics' | 'subscriptions' | 'visits' | 'inventory' | 'recurring'
): { hasAccess: boolean; response?: NextResponse } {
  // Админы имеют доступ ко всему
  if (!organization) {
    return { hasAccess: true }
  }

  const features = organization.features || {}
  console.log('🔍 [checkFeature] User modules:', JSON.stringify(features))
  console.log('🔍 [checkFeature] Checking feature:', featureName)
  
  // Check new modular system first
  const modules = features.modules
  if (modules) {
    console.log('🔍 [checkFeature] Using new modular system, modules:', JSON.stringify(modules))
    const hasAccess = modules[featureName] === true
    console.log(`🔍 [checkFeature] Has ${featureName}:`, hasAccess)
    
    if (!hasAccess) {
      return {
        hasAccess: false,
        response: NextResponse.json(
          { error: 'הפיצ\'ר לא זמין בתוכנית שלך' },
          { status: 403 }
        ),
      }
    }
    return { hasAccess: true }
  }
  
  // Fallback to old feature system
  console.log('🔍 [checkFeature] Using old feature system')
  const hasAccess = features[featureName] === true
  console.log(`🔍 [checkFeature] Has ${featureName}:`, hasAccess)

  if (!hasAccess) {
    return {
      hasAccess: false,
      response: NextResponse.json(
        { error: 'הפיצ\'ר לא זמין בתוכנית שלך' },
        { status: 403 }
      ),
    }
  }

  return { hasAccess: true }
}

/**
 * Комбинированная проверка: авторизация + фича
 */
export async function checkAuthAndFeature(
  featureName: 'sms' | 'payments' | 'analytics' | 'subscriptions' | 'visits' | 'inventory' | 'recurring'
): Promise<
  | { success: true; data: AuthCheckResult }
  | { success: false; response: NextResponse }
> {
  const authResult = await checkAuth()

  if (!authResult.success) {
    return authResult
  }

  // Админы минуют проверку фич
  if (authResult.data.isAdmin) {
    return authResult
  }

  const featureCheck = checkFeature(authResult.data.organization, featureName)

  if (!featureCheck.hasAccess) {
    return {
      success: false,
      response: featureCheck.response!,
    }
  }

  return authResult
}
