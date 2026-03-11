import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

// GET /api/staff-permissions?userId=xxx — разрешения конкретного сотрудника
export async function GET(request: NextRequest) {
  const auth = await getAuthContext()
  if ('error' in auth) return auth.error

  const { orgId, supabase } = auth
  const userId = new URL(request.url).searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('staff_permissions')
    .select('permission_key, is_enabled')
    .eq('org_id', orgId)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result: Record<string, boolean> = {}
  for (const row of data || []) {
    result[row.permission_key] = row.is_enabled
  }

  return NextResponse.json(result)
}

// PUT /api/staff-permissions — upsert одного разрешения
export async function PUT(request: NextRequest) {
  const auth = await getAuthContext()
  if ('error' in auth) return auth.error

  const { orgId, orgRole, supabase } = auth

  if (orgRole !== 'owner') {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 })
  }

  const { user_id, permission_key, is_enabled } = await request.json()

  if (!user_id || !permission_key || is_enabled === undefined) {
    return NextResponse.json({ error: 'user_id, permission_key, is_enabled required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('staff_permissions')
    .upsert(
      { org_id: orgId, user_id, permission_key, is_enabled },
      { onConflict: 'org_id,user_id,permission_key' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
