import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const org_id = searchParams.get('org_id')
    const minAmount = searchParams.get('min_amount')
    const daysBack = searchParams.get('days_back')

    if (!org_id) {
      return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all visits with amount > 0 and no completed payment
    let query = supabase
      .from('visits')
      .select(`
        id,
        client_id,
        scheduled_at,
        price,
        clients!inner (
          id,
          first_name,
          last_name,
          phone
        )
      `)
      .eq('org_id', org_id)
      .gt('price', 0)

    // Filter by date if needed
    if (daysBack) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysBack))
      query = query.lte('scheduled_at', cutoffDate.toISOString())
    }

    const { data: visits, error: visitsError } = await query

    if (visitsError) throw visitsError

    if (!visits || visits.length === 0) {
      return NextResponse.json({ debts: [], total: 0 })
    }

    // Get all payments for these visits
    const visitIds = visits.map((v) => v.id)
    const { data: payments } = await supabase
      .from('payments')
      .select('visit_id, status')
      .in('visit_id', visitIds)
      .eq('status', 'completed')

    const paidVisitIds = new Set(payments?.map((p) => p.visit_id) || [])

    // Filter out paid visits
    const unpaidVisits = visits.filter((v) => !paidVisitIds.has(v.id))

    // Group by client
    const clientDebts = new Map()

    for (const visit of unpaidVisits) {
      const client = visit.clients as any
      const clientId = client.id

      if (!clientDebts.has(clientId)) {
        clientDebts.set(clientId, {
          client_id: clientId,
          first_name: client.first_name,
          last_name: client.last_name,
          phone: client.phone,
          unpaid_visits: 0,
          total_debt: 0,
          oldest_debt_date: visit.scheduled_at,
          visit_ids: [],
        })
      }

      const debt = clientDebts.get(clientId)
      debt.unpaid_visits++
      debt.total_debt += parseFloat(visit.price) || 0
      debt.visit_ids.push(visit.id)

      // Update oldest date
      if (new Date(visit.scheduled_at) < new Date(debt.oldest_debt_date)) {
        debt.oldest_debt_date = visit.scheduled_at
      }
    }

    let debts = Array.from(clientDebts.values())

    // Filter by minimum amount
    if (minAmount) {
      debts = debts.filter((d) => d.total_debt >= parseFloat(minAmount))
    }

    // Sort by total debt descending
    debts.sort((a, b) => b.total_debt - a.total_debt)

    const totalDebt = debts.reduce((sum, d) => sum + d.total_debt, 0)

    return NextResponse.json({
      debts,
      total: totalDebt,
    })
  } catch (error: any) {
    console.error('Get debts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debts', details: error.message },
      { status: 500 }
    )
  }
}
