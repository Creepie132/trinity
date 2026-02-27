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

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    // Fetch visits this month with service info
    const { data: visits } = await supabase
      .from('visits')
      .select('service_id, services(name, name_ru)')
      .eq('org_id', org_id)
      .gte('scheduled_at', startOfMonth)
      .not('service_id', 'is', null)

    // Count by service
    const serviceCounts: Record<string, number> = {}
    visits?.forEach((visit: any) => {
      const serviceName = visit.services?.name_ru || visit.services?.name
      if (serviceName) {
        serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1
      }
    })

    // Sort and take top 5
    const topServices = Object.entries(serviceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count], index) => ({
        name: name,
        count: count,
        fill: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index],
      }))

    return NextResponse.json(topServices)
  } catch (error: any) {
    console.error('Top services error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch top services', details: error.message },
      { status: 500 }
    )
  }
}
