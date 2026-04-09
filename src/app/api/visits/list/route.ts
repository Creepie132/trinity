// ================================================
// TRINITY CRM - Visits List API
// GET /api/visits/list
//
// Zero Trust: orgId только из getAuthContext().
// Полная поддержка фильтров, пагинации, поиска.
// Заменяет прямой supabase.from('visits') в visits/page.tsx.
// ================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { listVisitsSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    // 1. Auth — orgId только с сервера
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    // 2. Парсинг + Zod-валидация query params
    const sp = request.nextUrl.searchParams
    const parsed = listVisitsSchema.safeParse({
      dateFilter:      sp.get('dateFilter')      ?? 'week',
      date:            sp.get('date')            ?? undefined,
      statusFilter:    sp.get('statusFilter')     ?? 'all',
      eventTypeFilter: sp.get('eventTypeFilter')  ?? 'all',
      search:          sp.get('search')           ?? undefined,
      page:            sp.get('page')             ?? '1',
      pageSize:        sp.get('pageSize')         ?? '30',
    })

    if (!parsed.success) {
      const errors = parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { dateFilter, date, statusFilter, eventTypeFilter, search, page, pageSize } = parsed.data
    const service = createSupabaseServiceClient()

    // 3. Базовый запрос
    let query = service
      .from('visits')
      .select(
        `*, status,
         clients(first_name, last_name, phone, email),
         services(id, name, name_ru, duration_minutes, price),
         visit_services(id, visit_id, service_id, service_name, service_name_ru, price, duration_minutes, created_at)`,
        { count: 'exact' }
      )
      .eq('org_id', orgId)
      .order('scheduled_at', { ascending: false })

    // 4. Фильтр по статусу
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    // 5. Фильтр по типу события
    if (eventTypeFilter !== 'all') {
      query = query.eq('event_type', eventTypeFilter)
    }

    // 6. Фильтр по дате
    if (dateFilter !== 'all') {
      const now = new Date()
      const start = new Date()
      if (dateFilter === 'today') {
        start.setHours(0, 0, 0, 0)
      } else if (dateFilter === 'week') {
        start.setDate(now.getDate() - now.getDay())
        start.setHours(0, 0, 0, 0)
      } else if (dateFilter === 'month') {
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
      } else if (dateFilter === 'day' && date) {
        // Точный фильтр по дню: date=YYYY-MM-DD
        // Используем Israel timezone (UTC+3) — начало и конец дня
        const [y, m, d] = date.split('-').map(Number)
        const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
        dayStart.setTime(dayStart.getTime() - 3 * 60 * 60 * 1000) // 00:00 Israel = 21:00 UTC prev day
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
        query = query
          .gte('scheduled_at', dayStart.toISOString())
          .lt('scheduled_at', dayEnd.toISOString())
        // Ранний выход — не применяем .gte ниже
        const { data, error, count } = await query.range((page - 1) * pageSize, (page - 1) * pageSize + pageSize - 1)
        if (error) {
          console.error('[API] GET /api/visits/list error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json({ data: data ?? [], count: count ?? 0, page, pageSize })
      }
      query = query.gte('scheduled_at', start.toISOString())
    }

    // 7. Пагинация
    const from = (page - 1) * pageSize
    const to   = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[API] GET /api/visits/list error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let visits = data ?? []

    // 8. Поиск (client-side после DB query — т.к. нет FTS на clients)
    //    Применяем только если search >= 2 символа
    if (search && search.trim().length >= 2) {
      const q = search.trim().toLowerCase()
      visits = visits.filter((v: any) =>
        (v.clients?.first_name || '').toLowerCase().includes(q) ||
        (v.clients?.last_name  || '').toLowerCase().includes(q) ||
        (v.clients?.phone      || '').includes(search.trim())
      )
    }

    return NextResponse.json({
      data:  visits,
      count: count ?? 0,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('[API] GET /api/visits/list exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
