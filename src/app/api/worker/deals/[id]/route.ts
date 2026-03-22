import { NextRequest, NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

const ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

// GET /api/worker/deals/[id] — full deal details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth
    const { id } = await params

    const supabase = createSupabaseServiceClient()

    const { data: deal, error } = await supabase
      .from('deals')
      .select(`
        id, title, amount, currency, source, notes,
        expected_close_date, next_action, next_action_date,
        last_contact_at, stage_id, stage_updated_at,
        rejection_reason, rejection_category,
        setup_fee, commission_amount,
        created_at, updated_at,
        assigned_to, org_id, client_id,
        client:clients(
          id, first_name, last_name, phone, email,
          address, city, date_of_birth, notes,
          description, social_links, client_tags
        ),
        tags:deal_tag_assignments(tag:deal_tags(id, name, color)),
        stage:deal_stages(id, name, name_he, color, position, is_won, is_lost)
      `)
      .eq('id', id)
      .eq('org_id', ORG_ID)
      .single()

    if (error || !deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (deal.assigned_to !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json({ deal })
  } catch (err) {
    console.error('[GET /api/worker/deals/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/worker/deals/[id] — update deal + client fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth
    const { id } = await params

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const supabase = createSupabaseServiceClient()

    // Verify ownership
    const { data: existing } = await supabase
      .from('deals')
      .select('id, assigned_to, client_id, org_id')
      .eq('id', id)
      .eq('org_id', ORG_ID)
      .single()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.assigned_to !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // ── Deal fields whitelist ───────────────────────────────────────────────
    const DEAL_FIELDS = ['title','amount','currency','source','notes','expected_close_date','next_action','next_action_date','stage_id'] as const
    const dealUpdate: Record<string, unknown> = {}
    for (const f of DEAL_FIELDS) {
      if (f in body) dealUpdate[f] = body[f]
    }
    // Validate amount
    if ('amount' in dealUpdate) {
      const n = Number(dealUpdate.amount)
      if (!Number.isFinite(n) || n < 0 || n > 9_999_999) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      dealUpdate.amount = n
    }

    if (Object.keys(dealUpdate).length > 0) {
      dealUpdate.updated_at = new Date().toISOString()
      const { error: dealErr } = await supabase.from('deals').update(dealUpdate).eq('id', id)
      if (dealErr) return NextResponse.json({ error: dealErr.message }, { status: 500 })
    }

    // ── Client fields whitelist ────────────────────────────────────────────
    if (existing.client_id && body.client) {
      const CLIENT_FIELDS = ['first_name','last_name','phone','email','address','city','date_of_birth','notes','description'] as const
      const clientUpdate: Record<string, unknown> = {}
      for (const f of CLIENT_FIELDS) {
        if (f in body.client) clientUpdate[f] = body.client[f]
      }
      if (Object.keys(clientUpdate).length > 0) {
        const { error: clientErr } = await supabase.from('clients').update(clientUpdate).eq('id', existing.client_id)
        if (clientErr) return NextResponse.json({ error: clientErr.message }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/worker/deals/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
