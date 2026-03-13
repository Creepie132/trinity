import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await req.json()
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await service.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminEmail = user.email || ''
    const isAdmin = ['ambersolutions.systems@gmail.com', 'creepie1357@gmail.com'].includes(adminEmail)
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: org } = await service.from('organizations').select('name, email').eq('id', orgId).single()
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

    const { data: session, error: sessErr } = await service
      .from('impersonation_sessions')
      .insert({ admin_user_id: user.id, admin_email: adminEmail, target_org_id: orgId })
      .select('token')
      .single()
    if (sessErr) throw sessErr

    await service.from('audit_log').insert({
      org_id: orgId, user_email: adminEmail, user_id: user.id,
      action: 'impersonation_start', entity_type: 'impersonation',
      metadata: { org_name: org.name, org_email: org.email },
    })

    return NextResponse.json({ token: session.token, org_name: org.name })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
