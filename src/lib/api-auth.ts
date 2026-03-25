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
 * (из user_active_branch), а не всегда главная org.
 *
 * Performance: admin_users и org_users запрашиваются параллельно через
 * Promise.all — экономит один DB round-trip на каждый API-вызов.
 *
 * Fault tolerance: если один из параллельных запросов вернул DB-ошибку
 * (сеть, permissions, временный сбой) — возвращаем 503, а не падаем
 * с белым экраном. Supabase maybeSingle() никогда не возвращает ошибку
 * за «нет строк» — только за настоящие сбои.
 *
 * Caching: getActiveOrgId() обёрнут в React cache() — request-scoped,
 * сбрасывается автоматически на каждом новом запросе. ВАЖНО: если в
 * будущем перейдём на долгосрочный кэш (Redis/Upstash), необходимо
 * реализовать принудительную инвалидацию при бане/смене роли пользователя
 * через паттерн cache-key по user_id с TTL не более 60 секунд.
 */
export async function checkAuth(): Promise<
  | { success: true; data: AuthCheckResult }
  | { success: false; response: NextResponse }
> {
  const supabase = await getSupabaseServerClient()

  // 1. Верификация токена — должна быть первой
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const user = userData.user
  const email = user.email || ''

  // 2. admin_users + org_users параллельно — экономим один round-trip.
  //    Обе операции используют maybeSingle(): "нет строк" = { data: null, error: null }.
  //    Если error != null — это настоящий сбой (сеть, DB), возвращаем 503.
  const [adminResult, orgResult] = await Promise.all([
    supabase
      .from('admin_users')
      .select('email')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  if (adminResult.error) {
    console.error('[checkAuth] admin_users query error:', adminResult.error.message)
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Authentication service temporarily unavailable' },
        { status: 503 }
      ),
    }
  }

  if (orgResult.error) {
    console.error('[checkAuth] org_users query error:', orgResult.error.message)
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Authentication service temporarily unavailable' },
        { status: 503 }
      ),
    }
  }

  const isAdmin = !!adminResult.data
  const mainOrgId = orgResult.data?.org_id || ''

  if (!isAdmin && !mainOrgId) {
    return {
      success: false,
      response: NextResponse.json({ error: 'No organization access' }, { status: 403 }),
    }
  }

  // 3. Branch-aware: получаем активный филиал.
  //    getActiveOrgId() кэшируется React cache() — request-scoped, безопасно.
  //    Повторный вызов в рамках одного запроса не идёт в БД.
  //
  //    IMPERSONATION: суперадмин тоже использует activeOrgId из user_active_branch —
  //    это позволяет создавать платежи/визиты от имени просматриваемой org.
  //    mainOrgId остаётся как запасное значение если activeOrgId не задан.
  const activeOrgId = await getActiveOrgId(user.id, mainOrgId)
  const org_id = activeOrgId || mainOrgId

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

    // 5. Проверка активности организации.
    //    Если org заблокирована — сразу 403. Бан работает мгновенно
    //    потому что organization всегда читается из БД (не кэшируется).
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
 * Проверяет доступность фичи для организации.
 *
 * ВАЖНО: Этот метод проверяет features из organizations.features (JSONB),
 * которая читается свежо из БД на каждом запросе (не кэшируется).
 * Критические действия (смена прав, удаление) логируются через logAudit()
 * непосредственно в роутах — этот метод к аудиту не относится.
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

  // Новая модульная система
  const modules = features.modules
  if (modules) {
    const hasAccess = modules[featureName] === true
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

  // Fallback: старая система фич
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
