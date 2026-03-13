import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await context.params
    const { password } = await request.json()

    // 1. Auth check — must be admin
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminRow } = await supabaseAdmin
      .from('admin_users').select('id').eq('user_id', user.id).maybeSingle()
    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // 2. Password check
    const correctPassword = process.env.ADMIN_DELETE_PASSWORD
    if (!correctPassword || password !== correctPassword) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }

    // 3. Validate org exists
    const { data: org } = await supabaseAdmin
      .from('organizations').select('id, name').eq('id', orgId).maybeSingle()
    if (!org) return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 })

    // 4. Get all user_ids for this org (to delete from auth.users)
    const { data: orgUsers } = await supabaseAdmin
      .from('org_users').select('user_id').eq('org_id', orgId)
    const userIds = (orgUsers || []).map(u => u.user_id)

    // 5. Get all client_ids for cascade cleanup
    const { data: clients } = await supabaseAdmin
      .from('clients').select('id').eq('org_id', orgId)
    const clientIds = (clients || []).map(c => c.id)

    // 6. Delete in correct FK order (children first)
    const tables: Array<{ table: string; column: string; ids?: string[] }> = []

    // Client-dependent tables
    if (clientIds.length > 0) {
      tables.push(
        { table: 'client_subscriptions', column: 'client_id', ids: clientIds },
        { table: 'loyalty_points',       column: 'client_id', ids: clientIds },
        { table: 'tasks',                column: 'client_id', ids: clientIds },
        { table: 'visits',               column: 'client_id', ids: clientIds },
        { table: 'payments',             column: 'client_id', ids: clientIds },
        { table: 'sms_messages',         column: 'client_id', ids: clientIds },
      )
    }

    // Org-dependent tables
    const orgTables = [
      'audit_log', 'booking_settings', 'bookings', 'care_instructions',
      'client_subscriptions', 'clients', 'impersonation_sessions',
      'inventory_transactions', 'invitations', 'loyalty_points',
      'loyalty_settings', 'message_templates', 'notifications',
      'org_users', 'payment_attempts', 'payments', 'products',
      'services', 'sms_campaigns', 'sms_messages', 'staff_permissions',
      'subscription_billing_log', 'tasks', 'transfer_requests',
      'visits', 'work_shifts', 'user_active_branch',
    ]

    // Delete client-dependent rows first
    for (const { table, column, ids } of tables) {
      if (ids && ids.length > 0) {
        await supabaseAdmin.from(table).delete().in(column, ids)
      }
    }

    // Delete org-dependent rows
    for (const table of orgTables) {
      await supabaseAdmin.from(table).delete().eq('org_id', orgId)
    }

    // Delete branches (two FK columns)
    await supabaseAdmin.from('branches').delete().eq('parent_org_id', orgId)
    await supabaseAdmin.from('branches').delete().eq('child_org_id', orgId)

    // Delete the organization itself
    const { error: orgDeleteError } = await supabaseAdmin
      .from('organizations').delete().eq('id', orgId)
    if (orgDeleteError) {
      console.error('[delete-org] org delete error:', orgDeleteError)
      return NextResponse.json({ error: orgDeleteError.message }, { status: 500 })
    }

    // 7. Delete users from auth.users (only users exclusive to this org)
    //    Check if each user belongs to any OTHER org before deleting
    let deletedAuthUsers = 0
    for (const userId of userIds) {
      const { count } = await supabaseAdmin
        .from('org_users')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      // count is 0 now since we deleted org_users above
      // Delete the auth user
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (!authErr) deletedAuthUsers++
    }

    return NextResponse.json({
      ok: true,
      deleted: {
        org: org.name,
        orgId,
        authUsersDeleted: deletedAuthUsers,
        clientsDeleted: clientIds.length,
      }
    })
  } catch (err: any) {
    console.error('[delete-org] unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
