import { createClient, Session } from "@supabase/supabase-js"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseBrowserClient } from './supabase-browser'

type Role = "owner" | "moderator" | "user"

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
