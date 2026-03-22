import { NextRequest, NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// POST /api/worker/quick-note   — create note
// GET  /api/worker/quick-note   — list last 20 notes for this worker

const ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

export async function GET() {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth

    const supabase = createSupabaseServiceClient()

    const { data, error } = await supabase
      .from('worker_notes')
      .select(`
        id, text, created_at,
        deal:deals(id, title),
        client:clients(id, first_name, last_name)
      `)
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ notes: data ?? [] })
  } catch (err) {
    console.error('[GET /api/worker/quick-note]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const { text, deal_id, client_id } = body as {
      text: unknown; deal_id?: unknown; client_id?: unknown
    }

    if (typeof text !== 'string' || text.trim().length < 1) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }
    if (text.trim().length > 1000) {
      return NextResponse.json({ error: 'text max 1000 chars' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    // Validate deal ownership if provided
    if (typeof deal_id === 'string' && deal_id) {
      const { data: deal } = await supabase
        .from('deals')
        .select('id, assigned_to')
        .eq('id', deal_id)
        .eq('org_id', ORG_ID)
        .single()

      if (!deal || deal.assigned_to !== user.id) {
        return NextResponse.json({ error: 'Deal not found or not yours' }, { status: 403 })
      }

      // Update deal's next_action
      await supabase
        .from('deals')
        .update({
          next_action:     text.trim(),
          last_contact_at: new Date().toISOString(),
        })
        .eq('id', deal_id)
    }

    // Save to worker_notes
    const { data: note, error: noteErr } = await supabase
      .from('worker_notes')
      .insert({
        worker_id: user.id,
        org_id:    ORG_ID,
        text:      text.trim(),
        deal_id:   typeof deal_id   === 'string' && deal_id   ? deal_id   : null,
        client_id: typeof client_id === 'string' && client_id ? client_id : null,
      })
      .select('id, text, created_at')
      .single()

    if (noteErr) {
      console.error('[quick-note] insert:', noteErr)
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, note })
  } catch (err) {
    console.error('[POST /api/worker/quick-note]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
