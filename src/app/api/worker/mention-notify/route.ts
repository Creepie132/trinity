import { NextRequest, NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

const ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

// POST /api/worker/mention-notify
// Called when a worker writes @mention in a quick note.
// Creates a notification for the mentioned user.

export async function POST(request: NextRequest) {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth

    const body = await request.json().catch(() => null)
    if (!body?.mentioned_user_id || !body?.note_text) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    }

    const { mentioned_user_id, note_text, worker_name } = body

    // Don't notify yourself
    if (mentioned_user_id === user.id) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const supabase = createSupabaseServiceClient()

    // Verify mentioned user belongs to same org
    const { data: orgUser } = await supabase
      .from('org_users')
      .select('user_id')
      .eq('user_id', mentioned_user_id)
      .eq('org_id', ORG_ID)
      .single()

    if (!orgUser) {
      return NextResponse.json({ error: 'User not in org' }, { status: 403 })
    }

    const truncated = note_text.length > 120
      ? note_text.slice(0, 117) + '...'
      : note_text

    const { error } = await supabase.from('notifications').insert({
      org_id:   ORG_ID,
      user_id:  mentioned_user_id,
      type:     'mention',
      title:    `📣 ${worker_name ?? 'עובד'} הזכיר אותך בהערה`,
      body:     truncated,
      priority: 'high',
      is_read:  false,
    })

    if (error) {
      console.error('[mention-notify]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/worker/mention-notify]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
