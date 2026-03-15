import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * GET /api/clients/summary
 * Возвращает клиентов с агрегированной статистикой (визиты + платежи)
 * одним запросом к БД вместо трёх на клиенте.
 *
 * Query params:
 *   search  — фильтр по имени/телефону
 *   page    — страница (default: 1)
 *   limit   — размер страницы (default: 25)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error

    const { orgId } = auth
    const { searchParams } = req.nextUrl
    const search = searchParams.get('search')?.trim() || ''
    const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const limit  = Math.min(100, parseInt(searchParams.get('limit') || '25'))
    const from   = (page - 1) * limit
    const to     = from + limit - 1

    const service = createSupabaseServiceClient()

    // Resolve all org IDs in branch family (shared clients)
    const { data: parentRows } = await service
      .from('branches').select('parent_org_id').eq('child_org_id', orgId)
    const rootOrgId = parentRows?.[0]?.parent_org_id ?? orgId
    const { data: childRows } = await service
      .from('branches').select('child_org_id').eq('parent_org_id', rootOrgId).eq('is_active', true)
    const orgIds = Array.from(new Set([orgId, rootOrgId, ...(childRows?.map(r => r.child_org_id) ?? [])]))

    // Build clients query
    let clientsQ = service
      .from('clients')
      .select('id, first_name, last_name, phone, email, notes, created_at, org_id', { count: 'exact' })
      .in('org_id', orgIds)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (search) {
      const words = search.split(/\s+/).filter(Boolean)
      for (const word of words) {
        clientsQ = clientsQ.or(
          `first_name.ilike.%${word}%,last_name.ilike.%${word}%,phone.ilike.%${word}%,email.ilike.%${word}%`
        )
      }
    }

    const { data: clients, count, error } = await clientsQ
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!clients?.length) return NextResponse.json({ data: [], count: 0 })

    // Fetch visits + payments for this page of clients in parallel
    const clientIds = clients.map(c => c.id)
    const [{ data: visits }, { data: payments }] = await Promise.all([
      service.from('visits')
        .select('client_id, scheduled_at')
        .in('client_id', clientIds),
      service.from('payments')
        .select('client_id, amount')
        .in('client_id', clientIds)
        .eq('status', 'completed'),
    ])

    // Aggregate stats per client
    const visitMap: Record<string, { count: number; last: string | null }> = {}
    const payMap:   Record<string, number> = {}

    for (const v of visits ?? []) {
      if (!visitMap[v.client_id]) visitMap[v.client_id] = { count: 0, last: null }
      visitMap[v.client_id].count++
      if (!visitMap[v.client_id].last || v.scheduled_at > visitMap[v.client_id].last!) {
        visitMap[v.client_id].last = v.scheduled_at
      }
    }
    for (const p of payments ?? []) {
      payMap[p.client_id] = (payMap[p.client_id] ?? 0) + (p.amount ?? 0)
    }

    const data = clients.map(c => ({
      ...c,
      total_visits: visitMap[c.id]?.count  ?? 0,
      last_visit:   visitMap[c.id]?.last   ?? null,
      total_paid:   payMap[c.id]           ?? 0,
    }))

    return NextResponse.json({ data, count: count ?? 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
