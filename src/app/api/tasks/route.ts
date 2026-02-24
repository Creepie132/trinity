import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/tasks - список задач с фильтрами
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Получаем org_id пользователя
  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!orgUser) {
    return NextResponse.json({ error: 'No organization' }, { status: 403 })
  }

  // Параметры фильтрации
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // open, in_progress, done, cancelled
  const assignedTo = searchParams.get('assigned_to') // 'me' или user_id
  const date = searchParams.get('date') // YYYY-MM-DD для фильтра по due_date

  let query = supabase
    .from('tasks')
    .select(`
      *,
      client:clients(id, name, phone),
      assigned_user:org_users!tasks_assigned_to_fkey(user_id, full_name)
    `)
    .eq('org_id', orgUser.org_id)

  // Фильтр по статусу
  if (status) {
    query = query.eq('status', status)
  }

  // Фильтр по назначенному
  if (assignedTo === 'me') {
    query = query.eq('assigned_to', user.id)
  } else if (assignedTo) {
    query = query.eq('assigned_to', assignedTo)
  }

  // Фильтр по дате
  if (date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    
    query = query
      .gte('due_date', startOfDay.toISOString())
      .lte('due_date', endOfDay.toISOString())
  }

  // Сортировка: сначала по приоритету (urgent > high > normal > low), затем по дате
  const { data: tasks, error } = await query.order('due_date', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Дополнительная сортировка по приоритету в памяти
  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }
  const sortedTasks = tasks.sort((a, b) => {
    const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2
    const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2
    return priorityA - priorityB
  })

  return NextResponse.json(sortedTasks)
}

// POST /api/tasks - создать новую задачу
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
  } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Получаем org_id пользователя
  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!orgUser) {
    return NextResponse.json({ error: 'No organization' }, { status: 403 })
  }

  // Создаём задачу
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      org_id: orgUser.org_id,
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
    .select(`
      *,
      client:clients(id, name, phone),
      assigned_user:org_users!tasks_assigned_to_fkey(user_id, full_name)
    `)
    .single()

  if (error) {
    console.error('Create task error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Если задача назначена другому пользователю, создаём уведомление
  if (assigned_to && assigned_to !== user.id) {
    await supabase.from('notifications').insert({
      org_id: orgUser.org_id,
      user_id: assigned_to,
      type: 'task_assigned',
      title: 'Новая задача',
      body: title.trim(),
      link: `/diary?task=${task.id}`,
      reference_id: task.id,
    })
  }

  return NextResponse.json(task, { status: 201 })
}
