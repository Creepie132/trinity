import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * GET /api/clients/summary
 * Для обычных пользователей — все клиенты org.
 * Для sales agents (воркеров) — только assigned_to = user.id.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error

    const { orgId, user } = auth
    const { searchParams } = req.nextUrl
    const search = searchParams.get('search')?.trim() || ''
    const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const limit  = Math.min(100, parseInt(searchParams.get('limit') || '25'))
    const from   = (page - 1) * limit
    const to     = from + limit - 1

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

    // ── Build clients query ───────────────────────────────────────────────────
    let clientsQ = service
      .from('clients')
      .select('id, first_name, last_name, phone, email, notes, description, created_at, org_id, assigned_to', { count: 'exact' })
      .in('org_id', orgIds)
      .order('created_at', { ascending: false })
      .range(from, to)

    // Sales agent sees only their own clients
    if (isSalesAgent) {
      clientsQ = clientsQ.eq('assigned_to', user.id)
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
    const [{ data: visits }, { data: payments }] = await Promise.all([
      service.from('visits')
        .select('client_id, scheduled_at')
        .in('client_id', clientIds),
      service.from('payments')
        .select('client_id, amount')
        .in('client_id', clientIds)
        .eq('status', 'completed'),
    ])

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
