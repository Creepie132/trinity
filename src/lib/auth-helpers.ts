import { createClient, Session, User, SupabaseClient } from "@supabase/supabase-js"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseBrowserClient } from './supabase-browser'
import { NextRequest, NextResponse } from 'next/server'

type Role = "owner" | "moderator" | "user"

// ============================================
// Auth Context for API Routes
// Единая точка входа для авторизации в API
// ============================================

export interface AuthContext {
  user: User
  orgId: string
  orgRole: string | null
  isAdmin: boolean
  supabase: SupabaseClient
}

export interface AuthError {
  error: NextResponse
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

  // Верификация токена на сервере
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { 
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) 
    }
  }

  // Читаем из JWT claims (быстро, без запроса к БД)
  let orgId = user.app_metadata?.org_id as string | undefined
  const orgRole = user.app_metadata?.org_role as string | null ?? null
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

  // Branch override: если передан X-Branch-Org-Id — используем его
  // Проверка 1: пользователь является прямым member этой org
  // Проверка 2: пользователь является owner/moderator родительской org (для переключения на филиал)
  const branchOrgId = request?.headers.get('X-Branch-Org-Id')
  if (branchOrgId && branchOrgId !== orgId) {
    // Проверка 1: прямое членство
    const { data: directMembership } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('org_id', branchOrgId)
      .maybeSingle()

    if (directMembership?.org_id) {
      orgId = branchOrgId
    } else {
      // Проверка 2: пользователь — owner/moderator родительской org этого филиала
      const { data: branch } = await supabase
        .from('branches')
        .select('parent_org_id')
        .eq('child_org_id', branchOrgId)
        .maybeSingle()

      if (branch?.parent_org_id) {
        const { data: parentMembership } = await supabase
          .from('org_users')
          .select('org_id, role')
          .eq('user_id', user.id)
          .eq('org_id', branch.parent_org_id)
          .in('role', ['owner', 'moderator'])
          .maybeSingle()

        if (parentMembership?.org_id) {
          orgId = branchOrgId
        }
      }
    }
    // Если ни одна проверка не прошла — тихо игнорируем, используем mainOrgId
  }

  return { user, orgId, orgRole, isAdmin, supabase: supabase as unknown as SupabaseClient }
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

// Хелпер для обработки ошибок в API
export function authErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unauthorized"
  const status = message.includes("Unauthorized") ? 401 : 403
  return new Response(JSON.stringify({ error: message }), { status })
}
