import { createClient, Session, User, SupabaseClient } from "@supabase/supabase-js"
import { getActiveOrgId } from './get-active-org'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseBrowserClient } from './supabase-browser'
import { createSupabaseServiceClient } from './supabase-service'
import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_ORG_ID } from './impersonation-cookies'

type Role = "owner" | "moderator" | "user"

// ============================================
// Auth Context for API Routes
// Единая точка входа для авторизации в API
// ============================================

export interface AuthContext {
  user: User
  orgId: string        // activeOrgId — активный филиал (используется для всех запросов данных)
  mainOrgId: string    // основная org пользователя из JWT (для проверок прав)
  orgRole: string | null
  orgType: 'trinity' | 'payments_only'  // тип организации из JWT app_metadata
  isAdmin: boolean
  supabase: SupabaseClient
}

export interface AuthError {
  error: NextResponse
}

/**
 * Защита CRM API от пользователей payments_only.
 * Вызывать в начале любого API route, работающего с CRM-данными
 * (clients, visits, products, sales, payments и т.д.)
 *
 * Использование:
 * ```ts
 * const auth = await getAuthContext(request)
 * if ('error' in auth) return auth.error
 * const guard = requireTrinityAccess(auth)
 * if (guard) return guard
 * // → дальше только trinity-пользователи
 * ```
 */
export function requireTrinityAccess(auth: AuthContext): NextResponse | null {
  if (auth.isAdmin) return null  // суперадмин всегда имеет доступ
  if (auth.orgType === 'trinity') return null
  return NextResponse.json(
    { error: 'CRM access requires Trinity subscription', code: 'PAYMENTS_ONLY_ACCESS' },
    { status: 403 }
  )
}

/**
 * Получить контекст авторизации для API route
 * Читает org_id из JWT claims, fallback на org_users таблицу
 * 
 * @returns AuthContext или AuthError с готовым NextResponse
 * 
 * Использование:
 * ```ts
 * const auth = await getAuthContext()
 * if ('error' in auth) return auth.error
 * const { user, orgId, supabase } = auth
 * ```
 */
export async function getAuthContext(request?: NextRequest): Promise<AuthContext | AuthError> {
  // ── Mobile Bearer-token support ───────────────────────────────────────────
  // Если запрос приходит с заголовком Authorization: Bearer <jwt>
  // (FlutterFlow, мобильное приложение) — используем отдельный путь аутентификации.
  // Веб-версия (cookies) не затрагивается.
  const authHeader = request?.headers.get('Authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    const jwt = authHeader.slice(7)
    return getAuthContextFromBearer(jwt)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
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

  // Верификация токена на сервере (таймаут 10 сек — защита от Supabase timeout)
  let user: User | null = null
  let authError: Error | null = null
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('auth_timeout')), 10000)
    )
    const authPromise = supabase.auth.getUser().then(({ data, error }) => {
      if (error) throw error
      return data.user
    })
    user = await Promise.race([authPromise, timeoutPromise])
  } catch (e: any) {
    authError = e
  }

  if (authError || !user) {
    return { 
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) 
    }
  }

  // Читаем из JWT claims (быстро, без запроса к БД)
  let orgId = user.app_metadata?.org_id as string | undefined
  const orgRole = user.app_metadata?.org_role as string | null ?? null
  const orgType = (user.app_metadata?.org_type as 'trinity' | 'payments_only') ?? 'trinity'
  const isAdmin = user.app_metadata?.is_admin === true

  // Fallback на org_users если JWT пустой (первый логин до refresh токена)
  if (!orgId) {
    const { data: orgUser } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!orgUser?.org_id) {
      return { 
        error: NextResponse.json({ error: 'No organization' }, { status: 403 }) 
      }
    }
    orgId = orgUser.org_id
  }

  // Branch: читаем активный филиал из user_active_branch (источник истины — БД)
  // Сервер не доверяет заголовкам или localStorage от клиента
  const mainOrgId = orgId
  const activeOrgId = await getActiveOrgId(user.id, orgId)

  // ── Safe Impersonation ────────────────────────────────────────────────────
  // Если суперадмин вошёл «как пользователь» — кука impersonate_org_id
  // подменяет orgId БЕЗ изменения сессии Supabase и без записи в БД.
  // Кука HttpOnly — клиент не может её подделать.
  if (isAdmin) {
    const impersonateOrgId = cookieStore.get(COOKIE_ORG_ID)?.value
    if (impersonateOrgId) {
      const serviceClient = createSupabaseServiceClient()
      return {
        user,
        orgId: impersonateOrgId,
        mainOrgId,
        orgRole,
        orgType,
        isAdmin,
        supabase: serviceClient as unknown as SupabaseClient,
      }
    }
  }

  // orgId = activeOrgId чтобы все существующие роуты работали без изменений
  return { user, orgId: activeOrgId, mainOrgId, orgRole, orgType, isAdmin, supabase: supabase as unknown as SupabaseClient }
}

/**
 * Получить контекст авторизации + проверить что пользователь админ
 */
export async function getAdminAuthContext(): Promise<AuthContext | AuthError> {
  const auth = await getAuthContext()
  if ('error' in auth) return auth

  if (!auth.isAdmin) {
    // Fallback проверка в admin_users таблице
    const { data: adminUser } = await supabaseAdmin
      .from('admin_users')
      .select('user_id')
      .eq('user_id', auth.user.id)
      .single()

    if (!adminUser) {
      return { 
        error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) 
      }
    }
  }

  return auth
}

// ============================================
// JWT Custom Claims Helpers
// Читают данные из JWT токена без запроса в БД
// ============================================

/**
 * Получить org_id из сессии (JWT claims → fallback на таблицу)
 */
export async function getOrgIdFromSession(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return null
  
  // Сначала пробуем JWT claims (быстро, без запроса к БД)
  const orgId = session.user.app_metadata?.org_id
  if (orgId) return orgId
  
  // Fallback: старый способ через таблицу
  const { data } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', session.user.id)
    .single()
    
  return data?.org_id ?? null
}

/**
 * Проверить админ ли пользователь из сессии
 */
export function isAdminFromSession(session: Session | null): boolean {
  return session?.user?.app_metadata?.is_admin === true
}

/**
 * Получить роль пользователя в организации из сессии
 */
export function getOrgRoleFromSession(session: Session | null): string | null {
  return session?.user?.app_metadata?.org_role ?? null
}

/**
 * Получить org_id напрямую из JWT (синхронно, для уже полученной сессии)
 */
export function getOrgIdFromJwt(session: Session | null): string | null {
  return session?.user?.app_metadata?.org_id ?? null
}

interface AuthResult {
  userId: string
  orgId: string
  role: Role
  email: string
}

// Service role client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Проверить что пользователь принадлежит организации и имеет нужную роль
export async function requireOrgRole(
  orgId: string,
  requiredRoles: Role[]
): Promise<AuthResult> {
  // Get user from session (with cookies)
  const cookieStore = await cookies()
  const supabase = createServerClient(
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

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized")
  }

  // Use service role to check org_users (bypass RLS)
  const { data: orgUser, error: orgError } = await supabaseAdmin
    .from("org_users")
    .select("role, email")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single()

  if (orgError || !orgUser) {
    throw new Error("Not a member of this organization")
  }

  if (!requiredRoles.includes(orgUser.role as Role)) {
    throw new Error(`Requires role: ${requiredRoles.join(" or ")}. Your role: ${orgUser.role}`)
  }

  return {
    userId: user.id,
    orgId,
    role: orgUser.role as Role,
    email: orgUser.email,
  }
}

// Проверить что пользователь — системный админ
export async function requireAdmin(): Promise<{ userId: string; email: string }> {
  // Get user from session (with cookies)
  const cookieStore = await cookies()
  const supabase = createServerClient(
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

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized")
  }

  // First check JWT claims (fast, no DB query)
  if (user.app_metadata?.is_admin === true) {
    return { userId: user.id, email: user.email || '' }
  }

  // Fallback: Use service role to check admin_users (bypass RLS)
  const { data: adminUser } = await supabaseAdmin
    .from("admin_users")
    .select("email")
    .eq("user_id", user.id)
    .single()

  if (!adminUser) {
    throw new Error("Admin access required")
  }

  return { userId: user.id, email: adminUser.email }
}

// ============================================
// Worker Auth Context — для продажников Trinity
// Не требует org_id — только валидную сессию + is_sales_agent
// ============================================

export interface WorkerAuthContext {
  user: User
  isSalesAgent: boolean
  supabase: SupabaseClient
}

export async function getWorkerAuthContext(): Promise<WorkerAuthContext | AuthError> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // Параллельная проверка: admin_users + org_users одновременно (экономит ~150ms)
  const service = createSupabaseServiceClient()
  const [{ data: adminRow }, { data: orgRow }] = await Promise.all([
    service.from('admin_users').select('is_sales_agent').eq('user_id', user.id).maybeSingle(),
    service.from('org_users').select('role').eq('user_id', user.id).maybeSingle(),
  ])

  if (adminRow?.is_sales_agent) {
    return { user, isSalesAgent: true, supabase: supabase as unknown as SupabaseClient }
  }

  if (orgRow?.role === 'manager') {
    return { user, isSalesAgent: false, supabase: supabase as unknown as SupabaseClient }
  }

  return { error: NextResponse.json({ error: 'Sales agent access required' }, { status: 403 }) }
}

// ============================================
// Bearer Token Auth — для мобильных клиентов (FlutterFlow)
// Используется когда Authorization: Bearer <jwt> присутствует в запросе
// ============================================

async function getAuthContextFromBearer(jwt: string): Promise<AuthContext | AuthError> {
  // ВАЖНО: getUser(jwt) работает только с anon клиентом — он проверяет токен через Supabase Auth API.
  // Service role клиент НЕ умеет верифицировать пользовательские JWT через getUser(jwt).
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data, error } = await anonClient.auth.getUser(jwt)
  if (error || !data.user) {
    console.error('[Bearer auth] getUser failed:', error?.message)
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const user = data.user
  const service = createSupabaseServiceClient()

  // Читаем org_id из JWT claims (fast path)
  let orgId = user.app_metadata?.org_id as string | undefined
  const orgRole = user.app_metadata?.org_role as string | null ?? null
  const orgType = (user.app_metadata?.org_type as 'trinity' | 'payments_only') ?? 'trinity'
  const isAdmin = user.app_metadata?.is_admin === true

  // Fallback: org_users таблица (первый логин до refresh токена)
  if (!orgId) {
    const { data: orgUser } = await service
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!orgUser?.org_id) {
      return { error: NextResponse.json({ error: 'No organization' }, { status: 403 }) }
    }
    orgId = orgUser.org_id
  }

  const mainOrgId = orgId
  // Читаем activeOrgId из БД — та же логика что и для веб-версии
  const activeOrgId = await getActiveOrgId(user.id, orgId)

  // Создаём Supabase client с токеном пользователя (для RLS-совместимости)
  const supabaseWithToken = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  )

  return {
    user,
    orgId: activeOrgId,
    mainOrgId,
    orgRole,
    orgType,
    isAdmin,
    supabase: supabaseWithToken as unknown as SupabaseClient,
  }
}

// Хелпер для обработки ошибок в API
export function authErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unauthorized"
  const status = message.includes("Unauthorized") ? 401 : 403
  return new Response(JSON.stringify({ error: message }), { status })
}
