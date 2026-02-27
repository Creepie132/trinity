import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const org_id = searchParams.get('org_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!org_id || !from || !to) {
      return NextResponse.json(
        { error: 'Missing org_id, from, or to' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Staff Report
    const { data: visits } = await supabase
      .from('visits')
      .select(`
        id,
        price,
        staff_user_id,
        org_users!inner (
          user_id,
          users (
            email
          )
        )
      `)
      .eq('org_id', org_id)
      .gte('scheduled_at', from)
      .lte('scheduled_at', to)

    // Get payments for these visits
    const visitIds = visits?.map((v) => v.id) || []
    let payments: any[] = []

    if (visitIds.length > 0) {
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('visit_id, amount, status')
        .in('visit_id', visitIds)
        .eq('status', 'completed')

      payments = paymentsData || []
    }

    // Map payments to visits
    const paymentsByVisit = new Map()
    payments.forEach((p) => {
      paymentsByVisit.set(p.visit_id, p.amount)
    })

    // Group by staff
    const staffStats = new Map()
    let totalRevenue = 0

    for (const visit of visits || []) {
      const staffId = visit.staff_user_id
      if (!staffId) continue

      const orgUser = visit.org_users as any
      const user = orgUser?.users as any
      const email = user?.email || 'Unknown'

      if (!staffStats.has(staffId)) {
        staffStats.set(staffId, {
          email,
          visits_count: 0,
          revenue: 0,
        })
      }

      const stats = staffStats.get(staffId)
      stats.visits_count++

      const payment = paymentsByVisit.get(visit.id)
      if (payment) {
        stats.revenue += parseFloat(payment)
        totalRevenue += parseFloat(payment)
      }
    }

    const staffReport = Array.from(staffStats.values()).map((s) => ({
      ...s,
      average_check: s.visits_count > 0 ? s.revenue / s.visits_count : 0,
      revenue_percent: totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0,
    }))

    // 2. Services Report
    const { data: servicesData } = await supabase
      .from('visits')
      .select(`
        id,
        service_id,
        service_type,
        price,
        services (
          name,
          name_ru
        )
      `)
      .eq('org_id', org_id)
      .gte('scheduled_at', from)
      .lte('scheduled_at', to)

    const serviceStats = new Map()
    let totalServiceRevenue = 0

    for (const visit of servicesData || []) {
      const service = visit.services as any
      const serviceName = service?.name_ru || service?.name || 'Other'

      if (!serviceStats.has(serviceName)) {
        serviceStats.set(serviceName, {
          service_name: serviceName,
          count: 0,
          revenue: 0,
        })
      }

      const stats = serviceStats.get(serviceName)
      stats.count++

      const payment = paymentsByVisit.get(visit.id)
      if (payment) {
        stats.revenue += parseFloat(payment)
        totalServiceRevenue += parseFloat(payment)
      }
    }

    const servicesReport = Array.from(serviceStats.values()).map((s) => ({
      ...s,
      revenue_percent: totalServiceRevenue > 0 ? (s.revenue / totalServiceRevenue) * 100 : 0,
    }))

    // Sort by revenue
    servicesReport.sort((a, b) => b.revenue - a.revenue)

    // 3. Client Activity Report
    const { data: clients } = await supabase
      .from('clients')
      .select('id, created_at')
      .eq('org_id', org_id)
      .gte('created_at', from)
      .lte('created_at', to)

    const newClients = clients?.length || 0

    // Returning clients (2+ visits in period)
    // Calculate manually
    const clientVisitMap = new Map()
    for (const visit of visits || []) {
      const clientId = (visit as any).client_id
      if (!clientId) continue

      clientVisitMap.set(clientId, (clientVisitMap.get(clientId) || 0) + 1)
    }

    const returningClients = Array.from(clientVisitMap.values()).filter(
      (count) => count >= 2
    ).length

    // Average interval between visits
    // Calculate manually by getting all visits for org and computing intervals
    let avgInterval = 0
    try {
      const { data: allVisits } = await supabase
        .from('visits')
        .select('client_id, scheduled_at')
        .eq('org_id', org_id)
        .order('client_id')
        .order('scheduled_at')

      if (allVisits && allVisits.length > 1) {
        const intervals: number[] = []
        for (let i = 1; i < allVisits.length; i++) {
          if (allVisits[i].client_id === allVisits[i - 1].client_id) {
            const diff = new Date(allVisits[i].scheduled_at).getTime() -
                        new Date(allVisits[i - 1].scheduled_at).getTime()
            intervals.push(diff / (1000 * 60 * 60 * 24)) // Convert to days
          }
        }

        if (intervals.length > 0) {
          avgInterval = Math.round(
            intervals.reduce((a, b) => a + b, 0) / intervals.length
          )
        }
      }
    } catch (error) {
      console.error('Failed to calculate avg interval:', error)
    }

    return NextResponse.json({
      staff: staffReport,
      services: servicesReport,
      clients: {
        new_clients: newClients,
        returning_clients: returningClients,
        avg_interval_days: avgInterval,
      },
      totals: {
        total_revenue: totalRevenue,
        total_visits: visits?.length || 0,
      },
    })
  } catch (error: any) {
    console.error('Reports error:', error)
    return NextResponse.json(
      { error: 'Failed to generate reports', details: error.message },
      { status: 500 }
    )
  }
}
