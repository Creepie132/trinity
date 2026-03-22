import { NextRequest, NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET  /api/worker/notifications   — list last 20 notifications
// PATCH /api/worker/notifications  — mark all as read

export async function GET() {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth

    const supabase = createSupabaseServiceClient()

    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, link, is_read, created_at, priority')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const unread = (data ?? []).filter(n => !n.is_read).length

    return NextResponse.json({ notifications: data ?? [], unread })
  } catch (err) {
    console.error('[GET /api/worker/notifications]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth

    const body = await request.json().catch(() => ({}))
    const { ids } = body as { ids?: string[] }

    const supabase = createSupabaseServiceClient()

    let query = supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (Array.isArray(ids) && ids.length > 0) {
      query = query.in('id', ids)
    }

    const { error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/worker/notifications]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
