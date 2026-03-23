import { NextRequest, NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/worker/meetings/[id]
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await getWorkerAuthContext()
  if ('error' in auth) return auth.error

  const { id } = await ctx.params
  const body = await request.json()
  const { title, description, due_date, client_id, meeting_location, meeting_duration_min, priority, status } = body

  const supabase = createSupabaseServiceClient()
  const { data: existing } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', id)
    .eq('assigned_to', auth.user.id)
    .eq('task_type', 'meeting')
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  if (title !== undefined)                updates.title = title.trim()
  if (description !== undefined)          updates.description = description?.trim() ?? null
  if (due_date !== undefined)             updates.due_date = due_date
  if (client_id !== undefined)            updates.client_id = client_id
  if (meeting_location !== undefined)     updates.meeting_location = meeting_location?.trim() ?? null
  if (meeting_duration_min !== undefined) updates.meeting_duration_min = meeting_duration_min
  if (priority !== undefined)             updates.priority = priority
  if (status !== undefined)               updates.status = status
  updates.updated_at = new Date().toISOString()

  const { error } = await supabase.from('tasks').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/worker/meetings/[id]
export async function DELETE(_: NextRequest, ctx: Ctx) {
  const auth = await getWorkerAuthContext()
  if ('error' in auth) return auth.error

  const { id } = await ctx.params
  const supabase = createSupabaseServiceClient()

  const { error } = await supabase
    .from('tasks')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('assigned_to', auth.user.id)
    .eq('task_type', 'meeting')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
