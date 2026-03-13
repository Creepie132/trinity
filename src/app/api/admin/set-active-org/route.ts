import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SUPER_ADMINS = ['ambersolutions.systems@gmail.com', 'creepie1357@gmail.com']

/**
 * POST /api/admin/set-active-org
 * Только для суперадмина — переключает activeOrgId на любую org
 * без проверки принадлежности к филиалам. Используется при impersonation.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await service.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!SUPER_ADMINS.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orgId } = await req.json()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    }

    const { data: org } = await service
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Org not found' }, { status: 404 })
    }

    // Переключаем activeOrgId без проверки филиалов
    const { error } = await service.from('user_active_branch').upsert({
      user_id: user.id,
      active_org_id: orgId,
      updated_at: new Date().toISOString(),
    })
    if (error) throw error

    const response = NextResponse.json({ ok: true, org_name: org.name })
    response.cookies.set('trinity_active_branch', orgId, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    })
    return response
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
