/**
 * POST /api/mobile/visits  — создание визита из мобильного приложения
 * GET  /api/mobile/visits  — список визитов (с Bearer-авторизацией)
 *
 * Auth: Bearer token (mobile)
 * Body: { client_id, service_id?, service_name?, scheduled_at, price, duration_minutes, notes?, services? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { israelLocalToUTC } from '@/lib/tz'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ─── GET /api/mobile/visits ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const supabase = createSupabaseServiceClient()
    const url = new URL(req.url)
    const dateFilter = url.searchParams.get('dateFilter') ?? 'week'

    let fromDate: Date
    const now = new Date()
    if (dateFilter === 'today') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (dateFilter === 'month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (dateFilter === 'all') {
      fromDate = new Date('2020-01-01')
    } else {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    const { data, error } = await supabase
      .from('visits')
      .select('*, clients(*), visit_services(*)')
      .eq('org_id', orgId)
      .gte('scheduled_at', fromDate.toISOString())
      .order('scheduled_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}


// ─── POST /api/mobile/visits ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { user, orgId, supabase } = auth

    const body = await req.json()
    const {
      client_id,
      service_id,
      service_name,
      scheduled_at: rawScheduledAt,
      price,
      duration_minutes,
      notes,
      services, // массив { service_id, quantity, price, duration }
      type,     // 'meeting' | 'visit'
    } = body

    // Валидация обязательных полей
    if (!rawScheduledAt) {
      return NextResponse.json({ error: 'scheduled_at обязателен' }, { status: 400 })
    }

    const serviceSupabase = createSupabaseServiceClient()

    // Разрешаем визиты без client_id (для встреч)
    const isVisit = type !== 'meeting'
    if (isVisit && !client_id) {
      return NextResponse.json({ error: 'client_id обязателен для визита' }, { status: 400 })
    }

    // Считаем итоговую цену и длительность из массива services если передан
    let totalPrice = typeof price === 'number' ? price
      : typeof price === 'string' ? parseFloat(price) || 0 : 0
    let totalDuration = typeof duration_minutes === 'number' ? duration_minutes
      : typeof duration_minutes === 'string' ? parseInt(duration_minutes) || 0 : 0

    if (Array.isArray(services) && services.length > 0) {
      totalPrice = services.reduce((s: number, r: any) =>
        s + (parseFloat(r.price ?? 0) * (r.quantity ?? 1)), 0)
      totalDuration = services.reduce((s: number, r: any) =>
        s + (parseInt(r.duration ?? 0) * (r.quantity ?? 1)), 0)
    }

    // Определяем service_id и service_type для основного визита
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    let primaryServiceId: string | null = null
    let primaryServiceName: string | null = null

    if (Array.isArray(services) && services.length > 0) {
      const first = services[0]
      primaryServiceId = first.service_id && uuidRegex.test(first.service_id)
        ? first.service_id : null
      primaryServiceName = first.name ?? service_name ?? null
    } else if (service_id && uuidRegex.test(service_id)) {
      primaryServiceId = service_id
      primaryServiceName = service_name ?? null
    } else if (service_name) {
      primaryServiceName = service_name
    }

    // Вставляем визит
    const insertData: Record<string, any> = {
      org_id: orgId,
      scheduled_at: rawScheduledAt,
      price: totalPrice,
      duration_minutes: totalDuration || null,
      notes: notes ?? null,
      status: 'scheduled',
      staff_user_id: user.id,
      event_type: type === 'meeting' ? 'meeting' : 'visit',
      service_id: primaryServiceId,
      service_type: primaryServiceName,
    }
    if (client_id) insertData.client_id = client_id

    const { data: visit, error: insertError } = await serviceSupabase
      .from('visits')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('[/api/mobile/visits POST] insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Вставляем visit_services если передан массив услуг
    if (Array.isArray(services) && services.length > 0 && visit) {
      const visitServices = services.map((r: any) => ({
        visit_id: visit.id,
        org_id: orgId,
        service_id: r.service_id && uuidRegex.test(r.service_id) ? r.service_id : null,
        service_name: r.name ?? null,
        service_name_ru: r.name ?? null,
        price: parseFloat(r.price ?? 0),
        quantity: r.quantity ?? 1,
        duration_minutes: parseInt(r.duration ?? 0),
      }))

      const { error: vsError } = await serviceSupabase
        .from('visit_services')
        .insert(visitServices)

      if (vsError) {
        console.error('[/api/mobile/visits POST] visit_services error (non-critical):', vsError)
      }
    }

    return NextResponse.json({ visit }, { status: 201 })
  } catch (e: any) {
    console.error('[/api/mobile/visits POST] exception:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
