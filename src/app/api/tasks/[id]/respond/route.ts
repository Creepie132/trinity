import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { queuePushNotification } from '@/lib/push-notify'

/**
 * POST /api/tasks/[id]/respond
 * Исполнитель принимает или отклоняет назначенную задачу.
 * body: { action: 'accepted' | 'rejected', rejection_reason?: string }
 *
 * Использует только queuePushNotification для уведомлений —
 * он уже пишет в notifications таблицу (прямой insert не нужен, иначе дубли).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { user } = auth

    const { id } = await params

    const body = await request.json().catch(() => null)
    if (!body?.action) {
      return NextResponse.json({ error: 'missing action' }, { status: 400 })
    }

    const { action, rejection_reason } = body as {
      action: 'accepted' | 'rejected'
      rejection_reason?: string
    }

    if (action !== 'accepted' && action !== 'rejected') {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }
    if (action === 'rejected' && !rejection_reason?.trim()) {
      return NextResponse.json({ error: 'rejection_reason required when rejecting' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    // Загрузить задачу — проверить что user = assigned_to
    const { data: task } = await supabase
      .from('tasks')
      .select('id, org_id, title, assigned_to, created_by, accept_status')
      .eq('id', id)
      .single()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    if (task.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Forbidden: you are not the assignee' }, { status: 403 })
    }
    if (task.accept_status === 'accepted' || task.accept_status === 'rejected') {
      return NextResponse.json({ error: 'Already responded' }, { status: 409 })
    }

    // Обновить accept_status задачи
    const { error: updateErr } = await supabase
      .from('tasks')
      .update({
        accept_status:    action,
        rejection_reason: action === 'rejected' ? rejection_reason!.trim() : null,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Имя исполнителя
    const assigneeName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email?.split('@')[0] ||
      ''

    // Уведомить создателя задачи — только через queuePushNotification
    // (он пишет в notifications + ставит push_sent: false для cron)
    if (task.created_by && task.created_by !== user.id) {
      if (action === 'accepted') {
        await queuePushNotification({
          org_id:       task.org_id,
          user_id:      task.created_by,
          type:         'task_accepted',
          title:        `✅ ${assigneeName} принял(а) задачу`,
          body:         task.title,
          link:         `/diary?task=${id}`,
          reference_id: id,
        })
      } else {
        await queuePushNotification({
          org_id:       task.org_id,
          user_id:      task.created_by,
          type:         'task_rejected',
          title:        `❌ ${assigneeName} отклонил(а) задачу`,
          body:         `${task.title}\nПричина: ${rejection_reason!.trim()}`,
          link:         `/diary?task=${id}`,
          reference_id: id,
        })
      }
    }

    return NextResponse.json({ ok: true, action })
  } catch (err) {
    console.error('[POST /api/tasks/[id]/respond]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
