import { createClient } from "@supabase/supabase-js"

type Role = "owner" | "moderator" | "user"

interface AuthResult {
  userId: string
  orgId: string
  role: Role
  email: string
}

// Проверить что пользователь принадлежит организации и имеет нужную роль
export async function requireOrgRole(
  orgId: string,
  requiredRoles: Role[]
): Promise<AuthResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized")
  }

  const { data: orgUser, error: orgError } = await supabase
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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized")
  }

  const { data: adminUser } = await supabase
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
