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

    // Get today's date range (00:00 to 23:59)
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

    // Fetch today's visits with client and service details (join through clients to filter by org_id)
    const { data: visits, error } = await supabase
      .from('visits')
      .select(`
        id,
        scheduled_at,
        status,
        notes,
        service_type,
        duration_minutes,
        price,
        clients!inner(
          id,
          first_name,
          last_name,
          org_id,
          phone
        ),
        services(
          id,
          name,
          name_ru,
          duration_minutes,
          price
        ),
        visit_services(
          id,
          service_name,
          service_name_ru,
          duration_minutes,
          price
        )
      `)
      .eq('clients.org_id', org_id)
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString())
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_at', { ascending: true })
      .limit(10)

    if (error) throw error

    // Return full visit objects with client details
    const formattedVisits = visits?.map(visit => {
      // clients is an object (inner join), not an array
      const client: any = visit.clients
      return {
        ...visit,
        // Keep original data structure for compatibility
        clientName: client 
          ? `${client.first_name || ''} ${client.last_name || ''}`.trim() 
          : 'Unknown'
      }
    }) || []

    console.log('[API /dashboard/today] Found visits:', formattedVisits.length)
    console.log('[API /dashboard/today] First visit:', formattedVisits[0])

    return NextResponse.json(formattedVisits)
  } catch (error: any) {
    console.error('Today visits error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch today visits', details: error.message },
      { status: 500 }
    )
  }
}
