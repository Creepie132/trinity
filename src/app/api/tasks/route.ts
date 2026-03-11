import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

// GET /api/tasks - список задач с фильтрами
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { orgId, supabase } = auth

    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (e: any) {
    console.error('Tasks catch:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/tasks - создать новую задачу
export async function POST(request: NextRequest) {
  const auth = await getAuthContext()
  if ('error' in auth) return auth.error
  
  const { user, orgId, supabase } = auth

  const body = await request.json()
  const {
    title,
    description,
    priority = 'normal',
    due_date,
    client_id,
    visit_id,
    payment_id,
    assigned_to,
    contact_phone,
    contact_email,
    contact_address,
    reminder,
  } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Создаём задачу
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      org_id: orgId,
      created_by: user.id,
      assigned_to: assigned_to || null,
      title: title.trim(),
      description: description || null,
      priority,
      due_date: due_date || null,
      client_id: client_id || null,
      visit_id: visit_id || null,
      payment_id: payment_id || null,
      contact_phone: contact_phone || null,
      contact_email: contact_email || null,
      contact_address: contact_address || null,
      status: 'open',
    })
    .select('*')
    .single()

  if (error) {
    console.error('Create task error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Если задача назначена другому пользователю, создаём уведомление
  if (assigned_to && assigned_to !== user.id) {
    await supabase.from('notifications').insert({
      org_id: orgId,
      user_id: assigned_to,
      type: 'task_assigned',
      title: 'Новая задача',
      body: title.trim(),
      link: `/diary?task=${task.id}`,
      reference_id: task.id,
    })
  }

  // Создаём напоминание за 2 часа до due_date
  if (reminder && due_date) {
    const reminderAt = new Date(new Date(due_date).getTime() - 2 * 60 * 60 * 1000).toISOString()
    const dueDateFormatted = new Date(due_date).toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    })
    await supabase.from('notifications').insert({
      org_id: orgId,
      user_id: user.id,
      type: 'task_reminder',
      title: `🔔 ${title.trim()}`,
      body: dueDateFormatted,
      link: `/diary`,
      reference_id: task.id,
      scheduled_at: reminderAt,
    }).then(({ error }) => {
      if (error) console.error('Reminder notification error:', error.message)
    })
  }

  return NextResponse.json(task, { status: 201 })
}
