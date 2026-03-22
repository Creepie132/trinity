import { NextRequest, NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// POST /api/worker/quick-note
// Body: { text: string, deal_id?: string, client_id?: string }
// Saves a quick note as a notification/activity for the worker's own record.
// Also updates the deal's next_action field if deal_id provided.

const ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

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

      // Update deal's next_action as the note text
      await supabase
        .from('deals')
        .update({
          next_action:     text.trim(),
          last_contact_at: new Date().toISOString(),
        })
        .eq('id', deal_id)
    }

    // Save as a self-notification (type: 'note') for history
    await supabase
      .from('notifications')
      .insert({
        org_id:     ORG_ID,
        user_id:    user.id,
        type:       'note',
        title:      '📝 ' + text.trim().slice(0, 80),
        body:       text.trim(),
        is_read:    false,
        priority:   'normal',
        reference_id: typeof deal_id === 'string' ? deal_id : undefined,
      })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/worker/quick-note]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
