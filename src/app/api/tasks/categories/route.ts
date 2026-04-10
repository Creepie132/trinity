import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

// GET /api/tasks/categories — список категорий org с количеством активных задач
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error

    const { orgId, supabase } = auth

    const { data, error } = await supabase
      .from('task_categories')
      .select(`
        id, name, color, sort_order, created_at,
        tasks ( id, status, archived_at )
      `)
      .eq('org_id', orgId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('GET task_categories error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Считаем активные задачи (не архивированные, статус open/in_progress)
    const categories = (data || []).map((cat: any) => {
      const activeTasks = (cat.tasks || []).filter(
        (t: any) => !t.archived_at && t.status === 'open'
      ).length
      const { tasks: _, ...rest } = cat
      return { ...rest, active_task_count: activeTasks }
    })

    return NextResponse.json(categories)
  } catch (e: any) {
    console.error('GET task_categories catch:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/tasks/categories — создать категорию
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error

    const { orgId, supabase } = auth
    const body = await request.json()
    const { name, color = '#C9A96E' } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (name.trim().length > 64) {
      return NextResponse.json({ error: 'Name too long (max 64)' }, { status: 400 })
    }

    // Проверяем уникальность имени в пределах org
    const { data: existing } = await supabase
      .from('task_categories')
      .select('id')
      .eq('org_id', orgId)
      .ilike('name', name.trim())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Category with this name already exists' }, { status: 409 }
      )
    }

    // Определяем sort_order — следующий после последнего
    const { data: last } = await supabase
      .from('task_categories')
      .select('sort_order')
      .eq('org_id', orgId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const sortOrder = ((last?.sort_order ?? 0) as number) + 10

    const { data: cat, error } = await supabase
      .from('task_categories')
      .insert({
        org_id:     orgId,
        name:       name.trim(),
        color:      color || '#C9A96E',
        sort_order: sortOrder,
      })
      .select('id, name, color, sort_order, created_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Category with this name already exists' }, { status: 409 }
        )
      }
      console.error('POST task_categories error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ...cat, active_task_count: 0 }, { status: 201 })
  } catch (e: any) {
    console.error('POST task_categories catch:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
