import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const org_id = searchParams.get('org_id')
    const days = parseInt(searchParams.get('days') || '30')

    if (!org_id) {
      return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Israel timezone
    const toIsraelDateKey = (date: Date): string =>
      date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })

    const todayKey = toIsraelDateKey(new Date())
    const startMs = new Date(todayKey + 'T00:00:00+03:00').getTime() - (days - 1) * 86400000
    const startDate = new Date(startMs)

    // Fetch with 3h buffer for timezone safety
    const fetchFrom = new Date(startDate.getTime() - 3 * 3600000)

    // Fetch visits for the period
    const { data: visits } = await supabase
      .from('visits')
      .select('scheduled_at')
      .eq('org_id', org_id)
      .gte('scheduled_at', fetchFrom.toISOString())
      .order('scheduled_at')

    // Group by day
    const visitsByDay: Record<string, number> = {}

    // Initialize all days with 0 using Israel dates
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getTime() + i * 86400000)
      const dayKey = toIsraelDateKey(d)
      visitsByDay[dayKey] = 0
    }

    // Count visits by day — group by Israel local date
    visits?.forEach((visit) => {
      const dayKey = toIsraelDateKey(new Date(visit.scheduled_at))
      if (visitsByDay[dayKey] !== undefined) {
        visitsByDay[dayKey] = (visitsByDay[dayKey] || 0) + 1
      }
    })

    // Format for chart
    const chartData = Object.entries(visitsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => {
        const d = new Date(date + 'T12:00:00+03:00')
        return {
          date: date,
          dateLabel: `${d.getDate()}/${d.getMonth() + 1}`,
          count: count,
        }
      })

    return NextResponse.json(chartData)
  } catch (error: any) {
    console.error('Visits chart error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch visits data', details: error.message },
      { status: 500 }
    )
  }
}
