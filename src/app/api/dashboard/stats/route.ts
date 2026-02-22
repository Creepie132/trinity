import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const org_id = searchParams.get('org_id')

    if (!org_id) {
      return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Date ranges
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    // 1. Total clients (current vs previous month new clients)
    const { count: clientsCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org_id)

    const { count: clientsPrevCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .lt('created_at', currentMonthStart.toISOString())

    const clientsChange = clientsPrevCount && clientsPrevCount > 0 
      ? ((clientsCount || 0) - clientsPrevCount) / clientsPrevCount * 100 
      : 0

    // 2. Visits this month vs previous month
    const { count: visitsCount } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .gte('scheduled_at', currentMonthStart.toISOString())

    const { count: visitsPrevCount } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .gte('scheduled_at', previousMonthStart.toISOString())
      .lt('scheduled_at', currentMonthStart.toISOString())

    const visitsChange = visitsPrevCount && visitsPrevCount > 0 
      ? ((visitsCount || 0) - visitsPrevCount) / visitsPrevCount * 100 
      : 0

    // 3. Revenue this month vs previous month
    const { data: revenueData } = await supabase
      .from('payments')
      .select('amount')
      .eq('org_id', org_id)
      .eq('status', 'completed')
      .gte('paid_at', currentMonthStart.toISOString())

    const revenue = revenueData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    const { data: revenuePrevData } = await supabase
      .from('payments')
      .select('amount')
      .eq('org_id', org_id)
      .eq('status', 'completed')
      .gte('paid_at', previousMonthStart.toISOString())
      .lte('paid_at', previousMonthEnd.toISOString())

    const revenuePrev = revenuePrevData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const revenueChange = revenuePrev > 0 ? (revenue - revenuePrev) / revenuePrev * 100 : 0

    // 4. Average check this month vs previous month
    const { count: paidVisitsCount } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .eq('status', 'completed')
      .gte('scheduled_at', currentMonthStart.toISOString())

    const averageCheck = paidVisitsCount && paidVisitsCount > 0 ? revenue / paidVisitsCount : 0

    const { count: paidVisitsPrevCount } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .eq('status', 'completed')
      .gte('scheduled_at', previousMonthStart.toISOString())
      .lt('scheduled_at', currentMonthStart.toISOString())

    const averageCheckPrev = paidVisitsPrevCount && paidVisitsPrevCount > 0 ? revenuePrev / paidVisitsPrevCount : 0
    const avgCheckChange = averageCheckPrev > 0 ? (averageCheck - averageCheckPrev) / averageCheckPrev * 100 : 0

    return NextResponse.json({
      clients: {
        value: clientsCount || 0,
        change: parseFloat(clientsChange.toFixed(1)),
      },
      visits: {
        value: visitsCount || 0,
        change: parseFloat(visitsChange.toFixed(1)),
      },
      revenue: {
        value: revenue,
        change: parseFloat(revenueChange.toFixed(1)),
      },
      avgCheck: {
        value: Math.round(averageCheck),
        change: parseFloat(avgCheckChange.toFixed(1)),
      },
    })
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error.message },
      { status: 500 }
    )
  }
}
