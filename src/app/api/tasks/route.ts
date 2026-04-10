import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { queuePushNotification } from '@/lib/push-notify'
import { enforceDemoLimit } from '@/lib/demo-limits'

// GET /api/tasks — список задач с JOIN на task_categories
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error

    const { user, orgId, orgRole, supabase } = auth

    const url    = new URL(request.url)
    const status = url.searchParams.get('status')

    let query = supabase
      .from('tasks')
      .select(`
        *,
        task_categories ( id, name, color )
      `)
      .eq('org_id', orgId)
      .or('task_type.is.null,task_type.neq.meeting')
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    // Владелец видит все, остальные — только свои
    if (orgRole !== 'owner') {
      query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
    }

    const { data, error } = await query

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Flatten: поднять category_name и category_color на верхний уровень
    const tasks = (data || []).map((t: any) => {
      const cat = t.task_categories
      const { task_categories: _, ...rest } = t
      return {
        ...rest,
        category_name:  cat?.name  ?? null,
        category_color: cat?.color ?? null,
      }
    })

    return NextResponse.json(tasks)
  } catch (e: any) {
    console.error('Tasks GET catch:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/tasks — создать задачу
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error

  const { user, orgId, supabase } = auth

  const limitError = await enforceDemoLimit(orgId, 'tasks')
  if (limitError) return limitError

  const body = await request.json()
  const {
    title,
    description,
    priority    = 'normal',
    due_date,
    task_kind   = 'todo',
    category_id,
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

  // Validate task_kind
  if (!['deadline', 'todo'].includes(task_kind)) {
    return NextResponse.json({ error: 'Invalid task_kind' }, { status: 400 })
  }

  // Validate category_id belongs to same org (if provided)
  if (category_id) {
    const { data: cat, error: catErr } = await supabase
      .from('task_categories')
      .select('id')
      .eq('id', category_id)
      .eq('org_id', orgId)
      .single()
    if (catErr || !cat) {
      return NextResponse.json({ error: 'Invalid category_id' }, { status: 400 })
    }
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      org_id:          orgId,
      created_by:      user.id,
      assigned_to:     assigned_to     || null,
      assigned_by:     assigned_to     ? user.id : null,
      title:           title.trim(),
      description:     description     || null,
      priority,
      task_kind,
      category_id:     category_id     || null,
      due_date:        due_date        || null,
      client_id:       client_id       || null,
      visit_id:        visit_id        || null,
      payment_id:      payment_id      || null,
      contact_phone:   contact_phone   || null,
      contact_email:   contact_email   || null,
      contact_address: contact_address || null,
      status:          'open',
    })
    .select(`*, task_categories ( id, name, color )`)
    .single()

  if (error) {
    console.error('Create task error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Flatten category
  const cat = (task as any).task_categories
  const { task_categories: _, ...taskRest } = task as any
  const result = {
    ...taskRest,
    category_name:  cat?.name  ?? null,
    category_color: cat?.color ?? null,
  }

  // Push уведомление назначенному пользователю
  const creatorName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split('@')[0] || ''

  if (assigned_to && assigned_to !== user.id) {
    await queuePushNotification({
      org_id:       orgId,
      user_id:      assigned_to,
      type:         'task_assigned',
      title:        creatorName
        ? `✅ ${creatorName} назначил(а) вам задачу`
        : '✅ הוקצתה לך משימה',
      body:         title.trim(),
      link:         `/diary?task=${task.id}`,
      reference_id: task.id,
    })
  }

  // Напоминание за 2 часа до дедлайна
  if (reminder && due_date) {
    const reminderAt = new Date(
      new Date(due_date).getTime() - 2 * 60 * 60 * 1000
    ).toISOString()
    const dueDateFormatted = new Date(due_date).toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    })
    await supabase.from('notifications').insert({
      org_id:       orgId,
      user_id:      user.id,
      type:         'task_reminder',
      title:        `🔔 ${title.trim()}`,
      body:         dueDateFormatted,
      link:         '/diary',
      reference_id: task.id,
      scheduled_at: reminderAt,
    }).then(({ error }) => {
      if (error) console.error('Reminder notification error:', error.message)
    })
  }

  return NextResponse.json(result, { status: 201 })
}
