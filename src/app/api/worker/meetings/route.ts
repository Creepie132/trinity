import { NextRequest, NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/worker/meetings
export async function GET(request: NextRequest) {
  const auth = await getWorkerAuthContext()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') ?? 'upcoming' // upcoming | past | all
  const search = searchParams.get('search') ?? ''

  const supabase = createSupabaseServiceClient()
  const now = new Date().toISOString()

  let query = supabase
    .from('tasks')
    .select(`
      id, title, description, status, priority, due_date,
      meeting_location, meeting_duration_min, created_at,
      client:clients(id, first_name, last_name, phone)
    `)
    .eq('assigned_to', auth.user.id)
    .eq('task_type', 'meeting')
    .is('archived_at', null)
    .order('due_date', { ascending: filter !== 'past' })
    .limit(50)

  if (filter === 'upcoming') query = query.gte('due_date', now)
  if (filter === 'past')     query = query.lt('due_date', now)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ meetings: data ?? [] })
}

// POST /api/worker/meetings — создать встречу
export async function POST(request: NextRequest) {
  const auth = await getWorkerAuthContext()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { title, description, due_date, client_id, meeting_location, meeting_duration_min, priority } = body

  if (!title?.trim() || !due_date) {
    return NextResponse.json({ error: 'title and due_date required' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()

  // Получаем org_id воркера
  const { data: orgRow } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: title.trim(),
      description: description?.trim() ?? null,
      due_date,
      client_id: client_id ?? null,
      meeting_location: meeting_location?.trim() ?? null,
      meeting_duration_min: meeting_duration_min ?? 60,
      priority: priority ?? 'medium',
      status: 'open',
      task_type: 'meeting',
      assigned_to: auth.user.id,
      created_by: auth.user.id,
      org_id: orgRow?.org_id ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
