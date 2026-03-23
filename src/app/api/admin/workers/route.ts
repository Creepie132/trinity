import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// Allowed permission keys for workers
const PERM_KEYS = [
  'can_manage_deals',
  'can_view_all_clients',
  'can_delete_deals',
  'can_view_reports',
  'phone_mask_enabled',
] as const

type PermKey = (typeof PERM_KEYS)[number]

/**
 * Apply staff_permissions for a newly created worker.
 * The fn_init_staff_on_join trigger creates default rows on INSERT into org_users.
 * This function upserts the admin-selected overrides immediately after.
 */
async function applyPermissions(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  orgId: string,
  userId: string,
  permissions: Partial<Record<PermKey, boolean>>,
) {
  const rows = PERM_KEYS
    .filter((k) => k in permissions)
    .map((k) => ({
      org_id: orgId,
      user_id: userId,
      permission_key: k,
      is_enabled: !!permissions[k],
    }))

  if (rows.length === 0) return

  const { error } = await supabase
    .from('staff_permissions')
    .upsert(rows, { onConflict: 'org_id,user_id,permission_key' })

  if (error) {
    console.error('[admin/workers] applyPermissions error:', error.message)
  }
}

/**
 * POST /api/admin/workers
 *
 * Creates a NEW worker directly from the admin panel:
 * 1. Validates that the requester is an owner
 * 2. Calls supabase.auth.admin.inviteUserByEmail -> creates auth user + sends invite email
 * 3. Inserts into org_users with user_id -> triggers fn_init_staff_on_join (creates staff_permissions)
 * 4. Upserts the admin-selected permissions
 *
 * If the email is already registered in Supabase Auth, returns error "email_exists"
 * so the frontend can direct the admin to use the regular invite flow instead.
 *
 * Security:
 * - Only org owners can call this endpoint
 * - orgId comes from getAuthContext() (server-side, from DB), never from request body
 * - All writes scoped to the authenticated org
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error

    const { user, orgId, supabase: authSupabase } = auth

    // Only owners can add workers — читаем роль из БД напрямую (не из JWT)
    const supabaseAdminCheck = createSupabaseServiceClient()
    const { data: requesterRow } = await supabaseAdminCheck
      .from('org_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (requesterRow?.role !== 'owner') {
      return NextResponse.json({ error: 'Owner only' }, { status: 403 })
    }

    const body = await request.json()
    const {
      email,
      full_name,
      role,
      permissions = {},
    }: {
      email: string
      full_name?: string
      role?: string
      permissions?: Partial<Record<PermKey, boolean>>
    } = body

    // --- Input validation ---
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Restrict to non-owner roles (owners are created differently)
    const workerRole = role === 'moderator' ? 'moderator' : role === 'manager' ? 'manager' : 'user'

    const supabaseAdmin = createSupabaseServiceClient()

    // --- Duplicate check: already in this org? ---
    const { data: existing } = await supabaseAdmin
      .from('org_users')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'already_in_org', message: 'User already in this organization' },
        { status: 409 },
      )
    }

    // --- Get org name for invite email ---
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ambersol.co.il'

    // --- Create auth user + send invite email ---
    // inviteUserByEmail: creates auth.users entry + sends invite email with set-password link.
    // If email already exists in auth.users -> returns error status 422.
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: {
          full_name: full_name?.trim() || normalizedEmail.split('@')[0],
        },
        redirectTo: `${appUrl}/auth/callback`,
      })

    if (inviteError) {
      const alreadyExists =
        inviteError.status === 422 ||
        inviteError.message?.toLowerCase().includes('already been registered') ||
        inviteError.message?.toLowerCase().includes('already registered')

      if (!alreadyExists) {
        console.error('[admin/workers] inviteUserByEmail failed:', inviteError.message)
        return NextResponse.json({ error: inviteError.message }, { status: 500 })
      }

      // Email уже зарегистрирован в auth.users (напр. через Google OAuth).
      // Находим существующего пользователя и добавляем его в org_users напрямую.
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      const existingUser = (listData?.users ?? []).find(
        (u: { email?: string }) => u.email?.toLowerCase() === normalizedEmail
      )

      if (!existingUser) {
        return NextResponse.json({ error: 'Failed to find existing user' }, { status: 500 })
      }

      const { error: insertError } = await supabaseAdmin.from('org_users').insert({
        org_id: orgId,
        email: normalizedEmail,
        role: workerRole,
        user_id: existingUser.id,
        joined_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error('[admin/workers] org_users insert (existing user) error:', insertError.message)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      await applyPermissions(supabaseAdmin, orgId, existingUser.id, permissions)

      return NextResponse.json({
        success: true,
        user_id: existingUser.id,
        email: normalizedEmail,
        role: workerRole,
      })
    }

    const userId = inviteData?.user?.id
    if (!userId) {
      console.error('[admin/workers] inviteUserByEmail returned no user id')
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // --- Insert into org_users (triggers fn_init_staff_on_join) ---
    // The trigger creates default staff_permissions + worker_dashboard_settings rows.
    const { error: insertError } = await supabaseAdmin.from('org_users').insert({
      org_id: orgId,
      email: normalizedEmail,
      role: workerRole,
      user_id: userId,
    })

    if (insertError) {
      console.error('[admin/workers] org_users insert error:', insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // --- Override permissions selected by admin ---
    // Trigger already created default rows; upsert admin-selected values on top.
    await applyPermissions(supabaseAdmin, orgId, userId, permissions)

    // --- Audit log (non-blocking, non-critical) ---
    void authSupabase
      .from('audit_log')
      .insert({
        org_id: orgId,
        user_id: user.id,
        action: 'worker_created',
        target_id: userId,
        metadata: {
          email: normalizedEmail,
          role: workerRole,
          org_name: org?.name ?? '',
          permissions_set: (Object.keys(permissions) as PermKey[]).filter((k) => permissions[k]),
        },
      })

    return NextResponse.json({
      success: true,
      user_id: userId,
      email: normalizedEmail,
      role: workerRole,
    })
  } catch (e: any) {
    console.error('[admin/workers] Unhandled error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
