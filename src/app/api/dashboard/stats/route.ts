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

    // 1. Total clients
    const { count: clientsCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org_id)

    // 2. Visits this month
    const { count: visitsCount } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .gte('scheduled_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    // 3. Revenue this month (completed payments)
    const { data: revenueData } = await supabase
      .from('payments')
      .select('amount')
      .eq('org_id', org_id)
      .eq('status', 'completed')
      .gte('paid_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    const revenue = revenueData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // 4. Average check (revenue / completed visits with payment)
    const { count: paidVisitsCount } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .eq('status', 'completed')
      .gte('scheduled_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    const averageCheck = paidVisitsCount && paidVisitsCount > 0 ? revenue / paidVisitsCount : 0

    return NextResponse.json({
      totalClients: clientsCount || 0,
      visitsThisMonth: visitsCount || 0,
      revenueThisMonth: revenue,
      averageCheck: Math.round(averageCheck),
    })
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error.message },
      { status: 500 }
    )
  }
}
