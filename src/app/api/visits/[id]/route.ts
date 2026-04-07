import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { validateBody, updateVisitSchema } from '@/lib/validations'

// GET /api/visits/[id] — получить один визит с данными клиента и услуги
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(request)
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
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error

  const { orgId, supabase } = auth
  const { id } = await params

  // ✅ Zod validation — защита от битых данных
  const rawBody = await request.json()
  const { data, error: validationError } = validateBody(updateVisitSchema, rawBody)
  if (validationError || !data) {
    return NextResponse.json({ error: validationError || 'Validation failed' }, { status: 400 })
  }

  // ── Читаем текущий визит — нужен для service_type NOT-NULL гарантии ────────────
  // service_type = legacy NOT NULL колонка (равна service_id).
  // Если клиент не передаёт service_id — берём текущее значение из БД.
  const { data: currentVisit, error: fetchErr } = await supabase
    .from('visits')
    .select('service_type, service_id')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (fetchErr || !currentVisit) {
    return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.scheduled_at !== undefined) updateData.scheduled_at = data.scheduled_at

  if (data.service_id !== undefined) {
    // Клиент явно передал service_id — обновляем оба поля
    updateData.service_id   = data.service_id
    // service_type NOT NULL: если service_id = null (встреча) — сохраняем старое значение
    updateData.service_type = data.service_id ?? currentVisit.service_type ?? 'other'
  } else {
    // service_id не передан — явно устанавливаем service_type из БД
    // чтобы не получить NULL в NOT NULL колонке
    updateData.service_type = currentVisit.service_type ?? 'other'
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
