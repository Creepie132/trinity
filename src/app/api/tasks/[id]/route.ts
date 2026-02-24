import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT /api/tasks/[id] - обновить задачу
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  // Получаем org_id пользователя
  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!orgUser) {
    return NextResponse.json({ error: 'No organization' }, { status: 403 })
  }

  // Проверяем существование задачи и права доступа
  const { data: existingTask } = await supabase
    .from('tasks')
    .select('status, assigned_to, title')
    .eq('id', id)
    .eq('org_id', orgUser.org_id)
    .single()

  if (!existingTask) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  // Подготовка данных для обновления
  const updateData: any = {
    updated_at: new Date().toISOString(),
  }

  // Обновляем только переданные поля
  if (body.title !== undefined) updateData.title = body.title.trim()
  if (body.description !== undefined) updateData.description = body.description
  if (body.status !== undefined) updateData.status = body.status
  if (body.priority !== undefined) updateData.priority = body.priority
  if (body.due_date !== undefined) updateData.due_date = body.due_date
  if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to
  if (body.client_id !== undefined) updateData.client_id = body.client_id
  if (body.visit_id !== undefined) updateData.visit_id = body.visit_id
  if (body.payment_id !== undefined) updateData.payment_id = body.payment_id
  if (body.contact_phone !== undefined) updateData.contact_phone = body.contact_phone
  if (body.contact_email !== undefined) updateData.contact_email = body.contact_email
  if (body.contact_address !== undefined) updateData.contact_address = body.contact_address

  // Если статус меняется на 'done', устанавливаем completed_at
  if (body.status === 'done' && existingTask.status !== 'done') {
    updateData.completed_at = new Date().toISOString()
  }

  // Если статус меняется с 'done' на что-то другое, очищаем completed_at
  if (body.status && body.status !== 'done' && existingTask.status === 'done') {
    updateData.completed_at = null
  }

  // Обновляем задачу
  const { data: task, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .eq('org_id', orgUser.org_id)
    .select(`
      *,
      client:clients(id, name, phone),
      assigned_user:org_users!tasks_assigned_to_fkey(user_id, full_name)
    `)
    .single()

  if (error) {
    console.error('Update task error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Если задача переназначена другому пользователю, создаём уведомление
  if (
    body.assigned_to !== undefined &&
    body.assigned_to !== existingTask.assigned_to &&
    body.assigned_to !== user.id
  ) {
    await supabase.from('notifications').insert({
      org_id: orgUser.org_id,
      user_id: body.assigned_to,
      type: 'task_assigned',
      title: 'Задача назначена вам',
      body: updateData.title || existingTask.title,
      link: `/diary?task=${id}`,
      reference_id: id,
    })
  }

  return NextResponse.json(task)
}

// DELETE /api/tasks/[id] - удалить задачу
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Получаем org_id пользователя
  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!orgUser) {
    return NextResponse.json({ error: 'No organization' }, { status: 403 })
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('org_id', orgUser.org_id)

  if (error) {
    console.error('Delete task error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
