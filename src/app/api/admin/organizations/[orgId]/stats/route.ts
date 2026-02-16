import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  try {
    const params = await context.params
    const { orgId } = params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // day, week, month, year

    // Check admin auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'day':
        startDate = new Date(now)
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        break
      case 'year':
        startDate = new Date(now)
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case 'month':
      default:
        startDate = new Date(now)
        startDate.setMonth(now.getMonth() - 1)
        break
    }

    // 1. Total clients count
    const { count: totalClients, error: clientsError } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)

    if (clientsError) {
      console.error('Clients count error:', clientsError)
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }

    // 2. Visits count (for the period)
    const { count: visitsCount, error: visitsError } = await supabase
      .from('visits')
      .select('*, clients!inner(org_id)', { count: 'exact', head: true })
      .eq('clients.org_id', orgId)
      .gte('scheduled_at', startDate.toISOString())

    if (visitsError) {
      console.error('Visits count error:', visitsError)
      return NextResponse.json({ error: 'Failed to fetch visits' }, { status: 500 })
    }

    // 3. Payments (sales) count and total amount (for the period)
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, clients!inner(org_id)')
      .eq('clients.org_id', orgId)
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())

    if (paymentsError) {
      console.error('Payments error:', paymentsError)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    const paymentsCount = payments?.length || 0
    const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      stats: {
        totalClients: totalClients || 0,
        visitsCount: visitsCount || 0,
        paymentsCount,
        totalRevenue,
      },
    })
  } catch (error: any) {
    console.error('Organization stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
