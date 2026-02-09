import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Утилита для проверки авторизации и features в API routes
 */

export interface AuthCheckResult {
  user: any
  email: string
  org_id: string
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
 * Проверяет авторизацию и получает данные пользователя + организации
 */
export async function checkAuth(): Promise<
  | { success: true; data: AuthCheckResult }
  | { success: false; response: NextResponse }
> {
  const supabase = await getSupabaseServerClient()

  // 1. Проверка пользователя
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user?.email) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const email = userData.user.email.toLowerCase()

  // 2. Проверка админа
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', email)
    .maybeSingle()

  const isAdmin = !!adminUser

  // 3. Получение org_id
  const { data: orgUser, error: orgError } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('email', email)
    .maybeSingle()

  if (!isAdmin && (orgError || !orgUser?.org_id)) {
    return {
      success: false,
      response: NextResponse.json({ error: 'No organization access' }, { status: 403 }),
    }
  }

  const org_id = orgUser?.org_id || ''

  // 4. Получение данных организации (если не админ)
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

    // 5. Проверка активности организации
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
  featureName: 'sms' | 'payments' | 'analytics'
): { hasAccess: boolean; response?: NextResponse } {
  // Админы имеют доступ ко всему
  if (!organization) {
    return { hasAccess: true }
  }

  const features = organization.features || {}
  const hasAccess = features[featureName] === true

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
  featureName: 'sms' | 'payments' | 'analytics'
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
