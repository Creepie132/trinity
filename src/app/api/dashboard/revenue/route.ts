import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const org_id = searchParams.get('org_id')
    const days = parseInt(searchParams.get('days') || '7')

    if (!org_id) {
      return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)

    // Fetch payments for the period
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, paid_at')
      .eq('org_id', org_id)
      .eq('status', 'completed')
      .gte('paid_at', startDate.toISOString())
      .order('paid_at')

    // Group by day
    const revenueByDay: Record<string, number> = {}
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dayKey = date.toISOString().split('T')[0]
      revenueByDay[dayKey] = 0
    }

    // Sum revenue by day
    payments?.forEach((payment) => {
      const dayKey = payment.paid_at.split('T')[0]
      revenueByDay[dayKey] = (revenueByDay[dayKey] || 0) + (payment.amount || 0)
    })

    // Format for chart
    const chartData = Object.entries(revenueByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => {
        const d = new Date(date)
        return {
          date: date,
          day: dayNames[d.getDay()],
          amount: Math.round(amount),
        }
      })

    return NextResponse.json(chartData)
  } catch (error: any) {
    console.error('Revenue chart error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue data', details: error.message },
      { status: 500 }
    )
  }
}
