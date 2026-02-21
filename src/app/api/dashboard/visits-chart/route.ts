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

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)

    // Fetch visits for the period
    const { data: visits } = await supabase
      .from('visits')
      .select('scheduled_at')
      .eq('org_id', org_id)
      .gte('scheduled_at', startDate.toISOString())
      .order('scheduled_at')

    // Group by day
    const visitsByDay: Record<string, number> = {}

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dayKey = date.toISOString().split('T')[0]
      visitsByDay[dayKey] = 0
    }

    // Count visits by day
    visits?.forEach((visit) => {
      const dayKey = visit.scheduled_at.split('T')[0]
      visitsByDay[dayKey] = (visitsByDay[dayKey] || 0) + 1
    })

    // Format for chart
    const chartData = Object.entries(visitsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => {
        const d = new Date(date)
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
