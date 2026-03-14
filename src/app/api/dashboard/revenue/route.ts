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

    // Israel timezone offset: UTC+2 (standard) / UTC+3 (DST)
    // We use 'Asia/Jerusalem' via Intl to get the correct local date
    const toIsraelDateKey = (date: Date): string => {
      return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }) // 'YYYY-MM-DD'
    }

    const nowInIsrael = new Date()
    // Build start date: go back (days-1) days from today in Israel time
    const todayKey = toIsraelDateKey(nowInIsrael)
    const startMs = new Date(todayKey + 'T00:00:00+03:00').getTime() - (days - 1) * 86400000
    const startDate = new Date(startMs)

    // Fetch payments for the period — use a safe UTC start (one day earlier to cover timezone)
    const fetchFrom = new Date(startDate.getTime() - 3 * 3600000) // subtract 3h for safety
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, paid_at')
      .eq('org_id', org_id)
      .eq('status', 'completed')
      .gte('paid_at', fetchFrom.toISOString())
      .order('paid_at')

    // Group by day
    const revenueByDay: Record<string, number> = {}
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

    // Initialize all days with 0 using Israel dates
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getTime() + i * 86400000)
      const dayKey = toIsraelDateKey(d)
      revenueByDay[dayKey] = 0
    }

    // Sum revenue by day — group by Israel local date
    payments?.forEach((payment) => {
      if (!payment.paid_at) return
      const dayKey = toIsraelDateKey(new Date(payment.paid_at))
      if (revenueByDay[dayKey] !== undefined) {
        revenueByDay[dayKey] = (revenueByDay[dayKey] || 0) + parseFloat(String(payment.amount || 0))
      }
    })

    // Format for chart
    const chartData = Object.entries(revenueByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => {
        const d = new Date(date + 'T12:00:00+03:00') // noon Israel time → correct day-of-week
        const rounded = Math.round(parseFloat(String(amount)))
        return {
          date: date,
          day: dayNames[d.getDay()],
          dateLabel: `${d.getDate()}/${d.getMonth() + 1}`,
          amount: rounded,
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
