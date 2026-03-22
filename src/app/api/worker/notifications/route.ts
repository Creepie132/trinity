import { NextRequest, NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET  /api/worker/notifications   — list last 20 notifications (с enrichment задач)
// PATCH /api/worker/notifications  — mark all as read

export async function GET() {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth

    const supabase = createSupabaseServiceClient()

    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, link, is_read, created_at, priority, reference_id')
      .eq('user_id', user.id)
      // Не показывать отложенные напоминания (scheduled_at > now())
      .or('scheduled_at.is.null,scheduled_at.lte.' + new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const notifications = data ?? []
    const unread = notifications.filter(n => !n.is_read).length

    // Обогащаем task_assigned — подтягиваем accept_status + rejection_reason из tasks
    const taskNotifs = notifications.filter(
      n => n.type === 'task_assigned' && n.reference_id
    )

    if (taskNotifs.length > 0) {
      const taskIds = taskNotifs.map(n => n.reference_id as string)
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, accept_status, rejection_reason')
        .in('id', taskIds)

      if (tasks && tasks.length > 0) {
        const taskMap = Object.fromEntries(tasks.map(t => [t.id, t]))
        const enriched = notifications.map(n => {
          if (n.type === 'task_assigned' && n.reference_id && taskMap[n.reference_id]) {
            const t = taskMap[n.reference_id]
            return {
              ...n,
              task_accept_status:    t.accept_status    ?? null,
              task_rejection_reason: t.rejection_reason ?? null,
            }
          }
          return n
        })
        return NextResponse.json({ notifications: enriched, unread })
      }
    }

    return NextResponse.json({ notifications, unread })
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
