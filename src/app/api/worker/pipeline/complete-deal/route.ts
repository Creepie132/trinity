import { NextRequest, NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// POST /api/worker/pipeline/complete-deal
// Body: { deal_id: string, setup_fee: number, notes?: string }
// Server calculates commission = setup_fee * 0.3 — NEVER trusted from client
// Writes to revenue_logs + updates deals.setup_fee

const ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const MAX_SETUP_FEE = 99_999

export async function POST(request: NextRequest) {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { deal_id, setup_fee, notes } = body as {
      deal_id: unknown
      setup_fee: unknown
      notes?: unknown
    }

    // ── Input Validation ────────────────────────────────────────────────────
    if (typeof deal_id !== 'string' || !deal_id.match(/^[0-9a-f-]{36}$/i)) {
      return NextResponse.json({ error: 'deal_id is required and must be a valid UUID' }, { status: 400 })
    }

    const fee = Number(setup_fee)
    if (!Number.isFinite(fee) || fee < 0 || fee > MAX_SETUP_FEE) {
      return NextResponse.json({
        error: `setup_fee must be a number between 0 and ${MAX_SETUP_FEE}`,
      }, { status: 400 })
    }
    const feeCents = Math.round(fee * 100) / 100
    const notesStr = typeof notes === 'string' ? notes.slice(0, 500).trim() || null : null

    const supabase = createSupabaseServiceClient()

    // ── Verify deal belongs to this worker (security guard) ─────────────────
    const { data: deal, error: dealErr } = await supabase
      .from('deals')
      .select('id, client_id, assigned_to, org_id')
      .eq('id', deal_id)
      .eq('org_id', ORG_ID)
      .single()

    if (dealErr || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }
    if (deal.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Forbidden: deal not assigned to you' }, { status: 403 })
    }

    // ── Upsert revenue_log (unique constraint on deal_id prevents duplicates) ─
    const { error: logErr } = await supabase
      .from('revenue_logs')
      .upsert(
        {
          deal_id:    deal.id,
          worker_id:  user.id,
          org_id:     ORG_ID,
          client_id:  deal.client_id,
          setup_fee:  feeCents,
          notes:      notesStr,
          entered_at: new Date().toISOString(),
        },
        { onConflict: 'deal_id' }
      )

    if (logErr) {
      console.error('[complete-deal] revenue_log upsert:', logErr)
      return NextResponse.json({ error: 'Failed to save revenue log' }, { status: 500 })
    }

    // ── Update deal record ──────────────────────────────────────────────────
    const { error: dealUpdateErr } = await supabase
      .from('deals')
      .update({
        setup_fee:            feeCents,
        setup_fee_entered_at: new Date().toISOString(),
        setup_fee_entered_by: user.id,
      })
      .eq('id', deal.id)

    if (dealUpdateErr) {
      console.error('[complete-deal] deal update:', dealUpdateErr)
      return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
    }

    const commission = Math.round(feeCents * 0.3 * 100) / 100

    return NextResponse.json({
      ok:                true,
      setup_fee:         feeCents,
      commission_amount: commission,
    })
  } catch (err) {
    console.error('[POST /api/worker/pipeline/complete-deal]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
