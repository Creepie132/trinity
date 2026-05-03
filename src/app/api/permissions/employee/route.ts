import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

const supabase = createSupabaseServiceClient()

// Whitelist колонок — защита от SQL-injection через dynamic keys
const ALLOWED_COLUMNS = new Set([
  'can_transfer_inventory', 'can_book_other_branches', 'can_view_all_reports',
  'can_manage_clients', 'can_manage_visits', 'can_export_clients',
  'can_view_all_clients', 'phone_mask_enabled', 'can_manage_deals',
  'can_delete_deals', 'can_view_reports', 'can_view_payments',
  'can_create_payments', 'can_apply_discounts', 'can_cancel_payments',
  'can_delete_clients', 'can_send_edit_links', 'can_delete_visits',
  'can_view_other_staff_visits', 'can_add_inventory', 'can_delete_inventory',
  'can_edit_services', 'can_manage_staff',
])

/**
 * GET /api/permissions/employee?userId=xxx
 * Возвращает полную строку staff_permissions сотрудника.
 */
export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  if (auth.orgRole !== 'owner') return NextResponse.json({ error: 'Owner only' }, { status: 403 })

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('staff_permissions')
    .select('*')
    .eq('org_id', auth.orgId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? {})
}

/**
 * PATCH /api/permissions/employee
 * Bulk-upsert разрешений сотрудника одним запросом.
 * Body: { user_id, permissions: Record<string,boolean>, permission_set_id? }
 */
export async function PATCH(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  if (auth.orgRole !== 'owner') return NextResponse.json({ error: 'Owner only' }, { status: 403 })

  const body = await req.json()
  const { user_id, permissions, permission_set_id } = body as {
    user_id: string
    permissions: Record<string, boolean>
    permission_set_id?: string | null
  }

  if (!user_id || typeof permissions !== 'object') {
    return NextResponse.json({ error: 'user_id and permissions required' }, { status: 400 })
  }

  // Whitelist — только известные колонки
  const safe: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [key, val] of Object.entries(permissions)) {
    if (ALLOWED_COLUMNS.has(key) && typeof val === 'boolean') safe[key] = val
  }
  if (permission_set_id !== undefined) safe.permission_set_id = permission_set_id ?? null

  const { error } = await supabase
    .from('staff_permissions')
    .upsert(
      { org_id: auth.orgId, user_id, ...safe },
      { onConflict: 'org_id,user_id' }
    )

  if (error) {
    console.error('[permissions/employee PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
