import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error

  const { orgId: mainOrgId } = auth
  const userId = auth.user.id

  const body = await request.json()
  const { orgId } = body

  if (!orgId || typeof orgId !== 'string') {
    return NextResponse.json({ error: 'orgId required' }, { status: 400 })
  }

  // Проверка: пользователь может активировать только свою mainOrg или свои филиалы
  if (orgId !== mainOrgId) {
    const { data: branch } = await supabaseAdmin
      .from('branches')
      .select('child_org_id')
      .eq('parent_org_id', mainOrgId)
      .eq('child_org_id', orgId)
      .maybeSingle()

    if (!branch) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  const { error } = await supabaseAdmin
    .from('user_active_branch')
    .upsert({
      user_id: userId,
      active_org_id: orgId,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
