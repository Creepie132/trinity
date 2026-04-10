import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

// DELETE /api/tasks/categories/[id] — удалить категорию (только если нет активных задач)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error

    const { orgId, supabase } = auth
    const { id } = await params

    // Проверяем что категория принадлежит org
    const { data: cat } = await supabase
      .from('task_categories')
      .select('id, name')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (!cat) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Проверяем активные задачи (open + не архивированные)
    const { count, error: countErr } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('org_id', orgId)
      .eq('status', 'open')
      .is('archived_at', null)

    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 })
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${count} active task(s) in this category` },
        { status: 409 }
      )
    }

    // Безопасно удаляем — FK SET NULL автоматически очистит category_id у задач
    const { error } = await supabase
      .from('task_categories')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) {
      console.error('DELETE task_categories error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('DELETE task_categories catch:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/tasks/categories/[id] — переименовать или изменить цвет
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error

    const { orgId, supabase } = auth
    const { id } = await params
    const body = await request.json()

    const update: any = {}
    if (body.name !== undefined) {
      if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
      update.name = body.name.trim()
    }
    if (body.color !== undefined) update.color = body.color
    if (body.sort_order !== undefined) update.sort_order = body.sort_order

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('task_categories')
      .update(update)
      .eq('id', id)
      .eq('org_id', orgId)
      .select('id, name, color, sort_order')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Name already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
