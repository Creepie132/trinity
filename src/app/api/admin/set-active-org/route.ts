import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS, used for admin-only operations
const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const SUPER_ADMINS = ['ambersolutions.systems@gmail.com', 'creepie1357@gmail.com']

/**
 * POST /api/admin/set-active-org
 * Только для суперадмина — переключает activeOrgId на любую org
 * без проверки принадлежности к филиалам. Используется при impersonation.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth check ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: missing token' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: empty token' }, { status: 401 })
    }

    const { data: { user }, error: authErr } = await service.auth.getUser(token)
    if (authErr || !user) {
      console.error('[set-active-org] Auth error:', authErr?.message)
      return NextResponse.json({ error: 'Unauthorized: invalid token' }, { status: 401 })
    }

    if (!SUPER_ADMINS.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden: not a super admin' }, { status: 403 })
    }

    // ── Body ────────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const { orgId } = body
    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    }

    // ── Verify org exists ───────────────────────────────────────────────────
    const { data: org, error: orgErr } = await service
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single()

    if (orgErr || !org) {
      console.error('[set-active-org] Org not found:', orgErr?.message)
      return NextResponse.json({ error: 'Org not found' }, { status: 404 })
    }

    // ── Switch active branch ────────────────────────────────────────────────
    // Use explicit UPDATE → INSERT fallback instead of upsert
    // to avoid potential conflict resolution issues
    const { error: updateErr } = await service
      .from('user_active_branch')
      .update({ active_org_id: orgId, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    if (updateErr) {
      // If update found no rows, try insert
      const { error: insertErr } = await service
        .from('user_active_branch')
        .insert({ user_id: user.id, active_org_id: orgId, updated_at: new Date().toISOString() })

      if (insertErr) {
        console.error('[set-active-org] Insert error:', insertErr.message, insertErr.code)
        return NextResponse.json(
          { error: `DB error: ${insertErr.message}` },
          { status: 500 }
        )
      }
    }

    // ── Response with cookie ────────────────────────────────────────────────
    const response = NextResponse.json({ ok: true, org_name: org.name })
    response.cookies.set('trinity_active_branch', orgId, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    })
    return response

  } catch (e: any) {
    console.error('[set-active-org] Unexpected error:', e.message, e.stack)
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
