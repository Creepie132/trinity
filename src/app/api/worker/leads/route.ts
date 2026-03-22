import { NextRequest, NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// POST /api/worker/leads/create
// Creates a client + deal in one transaction.
// Body: {
//   first_name: string       required
//   last_name?: string
//   phone: string            required
//   business_name?: string   — deal title
//   amount?: number
//   source?: string
//   notes?: string
// }

const ORG_ID         = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const NEW_LEAD_STAGE = 'caa20ce5-5501-46a1-856e-a197470a04f0'

export async function POST(request: NextRequest) {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const {
      first_name,
      last_name,
      phone,
      business_name,
      amount,
      source,
      notes,
    } = body as Record<string, unknown>

    // ── Validation ──────────────────────────────────────────────────────────
    if (typeof first_name !== 'string' || first_name.trim().length < 1) {
      return NextResponse.json({ error: 'first_name is required' }, { status: 400 })
    }
    if (typeof phone !== 'string' || phone.trim().length < 7) {
      return NextResponse.json({ error: 'phone is required (min 7 chars)' }, { status: 400 })
    }
    const amountNum = amount != null ? Number(amount) : 0
    if (!Number.isFinite(amountNum) || amountNum < 0 || amountNum > 9_999_999) {
      return NextResponse.json({ error: 'amount must be 0–9,999,999' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    // ── 1. Check for duplicate phone in this org ────────────────────────────
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('org_id', ORG_ID)
      .eq('phone', phone.trim())
      .maybeSingle()

    let clientId: string

    if (existingClient) {
      // Re-use existing client, just assign to worker if not assigned
      clientId = existingClient.id
      await supabase
        .from('clients')
        .update({ assigned_to: user.id })
        .eq('id', clientId)
        .is('assigned_to', null)
    } else {
      // ── 2. Create new client ──────────────────────────────────────────────
      const { data: newClient, error: clientErr } = await supabase
        .from('clients')
        .insert({
          org_id:      ORG_ID,
          first_name:  String(first_name).trim(),
          last_name:   typeof last_name === 'string' ? last_name.trim() : null,
          phone:       String(phone).trim(),
          notes:       typeof notes === 'string'    ? notes.trim()    : null,
          assigned_to: user.id,
        })
        .select('id')
        .single()

      if (clientErr || !newClient) {
        console.error('[create-lead] client insert:', clientErr)
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
      }
      clientId = newClient.id
    }

    // ── 3. Create deal ────────────────────────────────────────────────────────
    const dealTitle = typeof business_name === 'string' && business_name.trim()
      ? business_name.trim()
      : `${String(first_name).trim()} ${typeof last_name === 'string' ? last_name.trim() : ''}`.trim()

    const { data: deal, error: dealErr } = await supabase
      .from('deals')
      .insert({
        org_id:      ORG_ID,
        client_id:   clientId,
        stage_id:    NEW_LEAD_STAGE,
        assigned_to: user.id,
        title:       dealTitle,
        amount:      amountNum,
        currency:    'ILS',
        source:      typeof source === 'string' ? source.trim() : null,
        last_contact_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (dealErr || !deal) {
      console.error('[create-lead] deal insert:', dealErr)
      return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
    }

    return NextResponse.json({
      ok:        true,
      client_id: clientId,
      deal_id:   deal.id,
      is_new_client: !existingClient,
    }, { status: 201 })

  } catch (err) {
    console.error('[POST /api/worker/leads/create]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
