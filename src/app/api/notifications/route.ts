import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/notifications - список уведомлений для текущего пользователя
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread_only') === 'true'

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    // Не показывать отложенные напоминания (scheduled_at ещё не наступил)
    .or('scheduled_at.is.null,scheduled_at.lte.' + new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data: notifications, error } = await query

  if (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Обогащаем task_assigned уведомления актуальным статусом из таблицы tasks
  const taskNotifs = (notifications || []).filter(
    n => n.type === 'task_assigned' && n.reference_id
  )
  if (taskNotifs.length > 0) {
    const taskIds = taskNotifs.map(n => n.reference_id as string)
    // Используем service client — RLS tasks может не пропустить assigned_to пользователя
    const serviceClient = createSupabaseServiceClient()
    const { data: tasks } = await serviceClient
      .from('tasks')
      .select('id, accept_status, rejection_reason')
      .in('id', taskIds)

    if (tasks && tasks.length > 0) {
      const taskMap = Object.fromEntries(tasks.map(t => [t.id, t]))
      const enriched = (notifications || []).map(n => {
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
      return NextResponse.json(enriched)
    }
  }

  return NextResponse.json(notifications)
}

// PUT /api/notifications - пометить уведомления как прочитанные
export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { ids, all } = body

  if (all) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('Mark all notifications read error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Invalid ids array' }, { status: 400 })
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .in('id', ids)
    .eq('user_id', user.id)

  if (error) {
    console.error('Mark notifications read error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/notifications - удалить уведомление по id
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  // user_id фильтр — никто не может удалить чужое уведомление
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
