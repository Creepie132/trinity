import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/tasks - список задач с фильтрами
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('=== GET TASKS ===')
    console.log('User:', user?.id)
    console.log('Auth error:', authError?.message)
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: orgUser } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!orgUser) return NextResponse.json({ error: 'No organization' }, { status: 403 })

    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('org_id', orgUser.org_id)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query

    console.log('Tasks error:', error?.message)
    console.log('Tasks count:', data?.length)

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
    .select('*')
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
