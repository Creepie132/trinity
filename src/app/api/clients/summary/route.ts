import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * GET /api/clients/summary
 * Для обычных пользователей — все клиенты org.
 * Для sales agents (воркеров) — только assigned_to = user.id.
 *
 * PERF: visits и payments агрегируются через SQL RPC (GROUP BY в БД),
 * а не тянутся полностью в Node и считаются в JS.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error

    const { orgId, user } = auth
    const { searchParams } = req.nextUrl
    const search  = searchParams.get('search')?.trim() || ''
    const page    = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const limit   = Math.min(100, parseInt(searchParams.get('limit') || '25'))
    const sortBy  = searchParams.get('sortBy') || 'created_at'
    const from    = (page - 1) * limit
    const to      = from + limit - 1

    const service = createSupabaseServiceClient()

    // ── Check if this user is a sales agent ──────────────────────────────────
    const { data: agentRow } = await service
      .from('admin_users')
      .select('is_sales_agent')
      .eq('user_id', user.id)
      .maybeSingle()

    const isSalesAgent = agentRow?.is_sales_agent === true

    // ── Resolve org IDs for branch family ────────────────────────────────────
    const { data: parentRows } = await service
      .from('branches').select('parent_org_id').eq('child_org_id', orgId)
    const rootOrgId = parentRows?.[0]?.parent_org_id ?? orgId
    const { data: childRows } = await service
      .from('branches').select('child_org_id').eq('parent_org_id', rootOrgId).eq('is_active', true)
    const orgIds = Array.from(new Set([orgId, rootOrgId, ...(childRows?.map(r => r.child_org_id) ?? [])]))

    // ── Определяем SQL-сортировку ─────────────────────────────────────────────
    // last_visit / last_sale сортируются после JOIN с агрегатами (ниже)
    const sqlSortField =
      sortBy === 'alphabet'   ? 'first_name' :
      sortBy === 'created_at' ? 'created_at' :
      'created_at' // fallback для last_visit / last_sale

    const sqlAscending = sortBy === 'alphabet'

    // ── Build clients query ───────────────────────────────────────────────────
    let clientsQ = service
      .from('clients')
      .select('id, first_name, last_name, phone, email, address, city, date_of_birth, notes, description, paint_code, preferred_languages, loyalty_balance, created_at, org_id, assigned_to, avatar_url', { count: 'exact' })
      .in('org_id', orgIds)
      .order(sqlSortField, { ascending: sqlAscending })
      .range(from, to)

    // Sales agent sees their own clients OR clients without assignment (unassigned pool)
    if (isSalesAgent) {
      clientsQ = clientsQ.or(`assigned_to.eq.${user.id},assigned_to.is.null`)
    }

    if (search) {
      const words = search.split(/\s+/).filter(Boolean)
      for (const word of words) {
        clientsQ = clientsQ.or(
          `first_name.ilike.%${word}%,last_name.ilike.%${word}%,phone.ilike.%${word}%,email.ilike.%${word}%,description.ilike.%${word}%`
        )
      }
    }

    const { data: clients, count, error } = await clientsQ
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!clients?.length) return NextResponse.json({ data: [], count: 0 })

    const clientIds = clients.map(c => c.id)

    // ── PERF: агрегируем visits и payments одним SQL-запросом каждый ─────────
    // GROUP BY в БД — не тянем тысячи строк в Node
    const [visitsResult, paymentsResult] = await Promise.all([
      service.rpc('aggregate_visits_for_clients', { client_ids: clientIds }),
      service.rpc('aggregate_payments_for_clients', { client_ids: clientIds }),
    ])

    const visitMap: Record<string, { count: number; last: string | null }> = {}
    const payMap:   Record<string, number> = {}

    for (const row of (visitsResult.data ?? []) as Array<{ client_id: string; visit_count: number; last_visit: string | null }>) {
      visitMap[row.client_id] = { count: Number(row.visit_count), last: row.last_visit }
    }
    for (const row of (paymentsResult.data ?? []) as Array<{ client_id: string; total_paid: number }>) {
      payMap[row.client_id] = Number(row.total_paid)
    }

    const data = clients.map(c => ({
      ...c,
      total_visits: visitMap[c.id]?.count  ?? 0,
      last_visit:   visitMap[c.id]?.last   ?? null,
      total_paid:   payMap[c.id]           ?? 0,
    }))

    // ── Пост-сортировка для полей из агрегатов ────────────────────────────────
    if (sortBy === 'last_visit') {
      data.sort((a, b) => {
        if (!a.last_visit && !b.last_visit) return 0
        if (!a.last_visit) return 1   // null → в конец
        if (!b.last_visit) return -1
        return b.last_visit.localeCompare(a.last_visit) // новее → выше
      })
    } else if (sortBy === 'last_sale') {
      data.sort((a, b) => b.total_paid - a.total_paid) // больше потратил → выше
    }

    return NextResponse.json({ data, count: count ?? 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
