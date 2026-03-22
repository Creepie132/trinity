import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

const ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

// POST /api/worker/mention-respond
// Called when owner accepts or rejects a worker's mention notification.
// action: 'accepted' | 'rejected'
// rejection_reason: string (required when rejected)

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { user } = auth

    const body = await request.json().catch(() => null)
    if (!body?.notification_id || !body?.action) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    }

    const { notification_id, action, rejection_reason } = body as {
      notification_id: string
      action: 'accepted' | 'rejected'
      rejection_reason?: string
    }

    if (action !== 'accepted' && action !== 'rejected') {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }
    if (action === 'rejected' && !rejection_reason?.trim()) {
      return NextResponse.json({ error: 'rejection_reason required' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    // Load the mention notification — verify it belongs to this user
    const { data: notif } = await supabase
      .from('notifications')
      .select('id, user_id, sender_id, sender_name, title, body, type, mention_status')
      .eq('id', notification_id)
      .eq('type', 'mention')
      .single()

    if (!notif) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    if (notif.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (notif.mention_status !== 'pending') return NextResponse.json({ error: 'Already responded' }, { status: 409 })

    // Update mention status + mark as read
    const { error: updateErr } = await supabase
      .from('notifications')
      .update({
        mention_status:          action,
        mention_rejection_reason: action === 'rejected' ? rejection_reason!.trim() : null,
        is_read:                 true,
      })
      .eq('id', notification_id)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // Send response notification to the worker (sender)
    if (notif.sender_id) {
      const ownerName = user.email?.split('@')[0] || 'המנהל'

      if (action === 'accepted') {
        await supabase.from('notifications').insert({
          org_id:   ORG_ID,
          user_id:  notif.sender_id,
          type:     'mention_accepted',
          title:    `✅ ${ownerName} קיבל את ההערה שלך`,
          body:     notif.body ?? undefined,
          priority: 'normal',
          is_read:  false,
        })
      } else {
        await supabase.from('notifications').insert({
          org_id:   ORG_ID,
          user_id:  notif.sender_id,
          type:     'mention_rejected',
          title:    `❌ ${ownerName} דחה את ההערה שלך`,
          body:     `סיבה: ${rejection_reason!.trim()}`,
          priority: 'high',
          is_read:  false,
        })
      }
    }

    return NextResponse.json({ ok: true, action })
  } catch (err) {
    console.error('[POST /api/worker/mention-respond]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
