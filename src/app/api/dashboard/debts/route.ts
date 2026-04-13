import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) {
      // fallback: поддержка старого ?org_id= для совместимости
      const legacyOrgId = request.nextUrl.searchParams.get('org_id')
      if (!legacyOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = !('error' in auth)
      ? auth.orgId
      : request.nextUrl.searchParams.get('org_id')!

    const { searchParams } = request.nextUrl
    const minAmount = searchParams.get('min_amount')
    const daysBack  = searchParams.get('days_back')

    const supabase = createSupabaseServiceClient()
    const now = new Date()

    // ── Визиты с payment_status = 'unpaid' (новый механизм) ─────────────────
    let visitQuery = supabase
      .from('visits')
      .select(`id, client_id, scheduled_at, price, service_type,
               clients(id, first_name, last_name, phone),
               services(name, name_ru)`)
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .eq('payment_status', 'unpaid')
      .gt('price', 0)

    if (daysBack) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - parseInt(daysBack))
      visitQuery = visitQuery.lte('scheduled_at', cutoff.toISOString())
    }

    const { data: unpaidVisits, error: visitsError } = await visitQuery
    if (visitsError) throw visitsError

    // ── Продажи со статусом unpaid / partial ────────────────────────────────
    let salesQuery = supabase
      .from('sales')
      .select(`id, client_id, created_at, total_amount, description,
               clients(id, first_name, last_name, phone)`)
      .eq('org_id', orgId)
      .in('status', ['unpaid', 'partial'])
      .gt('total_amount', 0)

    if (daysBack) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - parseInt(daysBack))
      salesQuery = salesQuery.lte('created_at', cutoff.toISOString())
    }

    const { data: unpaidSales } = await salesQuery

    // ── Группировка по клиенту ───────────────────────────────────────────────
    const clientMap = new Map<string, {
      client_id: string; first_name: string; last_name: string; phone: string
      total_debt: number; oldest_debt_date: string; days_ago: number
      items: Array<{ id: string; type: 'visit' | 'sale'; label: string; date: string; amount: number; days_ago: number }>
    }>()

    const daysAgo = (dateStr: string) =>
      Math.floor((now.getTime() - new Date(dateStr).getTime()) / 86_400_000)

    const ensureClient = (client: any) => {
      if (!client || !client.id) return null
      if (!clientMap.has(client.id)) {
        clientMap.set(client.id, {
          client_id: client.id,
          first_name: client.first_name ?? '',
          last_name: client.last_name ?? '',
          phone: client.phone ?? '',
          total_debt: 0,
          oldest_debt_date: '',
          days_ago: 0,
          items: [],
        })
      }
      return clientMap.get(client.id)!
    }

    for (const v of unpaidVisits ?? []) {
      const entry = ensureClient((v as any).clients)
      if (!entry) continue
      const svc = (v as any).services
      const label = svc?.name_ru || svc?.name || v.service_type || '—'
      const amount = parseFloat(String(v.price)) || 0
      entry.total_debt += amount
      entry.items.push({ id: v.id, type: 'visit', label, date: v.scheduled_at, amount, days_ago: daysAgo(v.scheduled_at) })
      if (!entry.oldest_debt_date || new Date(v.scheduled_at) < new Date(entry.oldest_debt_date))
        entry.oldest_debt_date = v.scheduled_at
    }

    for (const s of unpaidSales ?? []) {
      const entry = ensureClient((s as any).clients)
      if (!entry) continue
      const amount = parseFloat(String(s.total_amount)) || 0
      entry.total_debt += amount
      const label = (s as any).description || 'Продажа'
      entry.items.push({ id: s.id, type: 'sale', label, date: s.created_at, amount, days_ago: daysAgo(s.created_at) })
      if (!entry.oldest_debt_date || new Date(s.created_at) < new Date(entry.oldest_debt_date))
        entry.oldest_debt_date = s.created_at
    }

    let debts = Array.from(clientMap.values()).map(d => ({
      ...d,
      days_ago: daysAgo(d.oldest_debt_date),
    }))

    if (minAmount) debts = debts.filter(d => d.total_debt >= parseFloat(minAmount))
    debts.sort((a, b) => b.total_debt - a.total_debt)

    const total = debts.reduce((s, d) => s + d.total_debt, 0)
    return NextResponse.json({ debts, total })
  } catch (error: any) {
    console.error('[GET /api/dashboard/debts]', error)
    return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 })
  }
}
