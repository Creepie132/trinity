import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { validateBody, updateVisitSchema } from '@/lib/validations'

// GET /api/visits/[id] — получить один визит с данными клиента и услуги
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if ('error' in auth) return auth.error
  const { orgId } = auth
  const { id } = await params

  const supabase = createSupabaseServiceClient()
  const { data: visit, error } = await supabase
    .from('visits')
    .select(`
      *,
      clients(id, first_name, last_name, phone, email),
      services(id, name, name_ru),
      visit_services(id, service_id, service_name, service_name_ru, price, duration_minutes)
    `)
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (error || !visit) {
    return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
  }

  return NextResponse.json({ visit })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if ('error' in auth) return auth.error

  const { orgId, supabase } = auth
  const { id } = await params

  // ✅ Zod validation — защита от битых данных
  const rawBody = await request.json()
  const { data, error: validationError } = validateBody(updateVisitSchema, rawBody)
  if (validationError || !data) {
    return NextResponse.json({ error: validationError || 'Validation failed' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.scheduled_at   !== undefined) updateData.scheduled_at   = data.scheduled_at
  if (data.service_id     !== undefined) {
    updateData.service_id   = data.service_id
    updateData.service_type = data.service_id  // backward compat
  }
  if (data.duration_minutes !== undefined) updateData.duration_minutes = data.duration_minutes
  if (data.notes            !== undefined) updateData.notes            = data.notes
  if (data.price            !== undefined) updateData.price            = data.price

  const { data: updated, error } = await supabase
    .from('visits')
    .update(updateData)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Update visit error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}
