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

    // Fetch today's visits with client and service details
    const { data: visits, error } = await supabase
      .from('visits')
      .select(`
        id,
        scheduled_at,
        status,
        notes,
        clients!inner(
          id,
          name
        )
      `)
      .eq('org_id', org_id)
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10)

    if (error) throw error

    // Format visits for response
    const formattedVisits = visits?.map(visit => {
      const scheduledDate = new Date(visit.scheduled_at)
      const hours = scheduledDate.getHours().toString().padStart(2, '0')
      const minutes = scheduledDate.getMinutes().toString().padStart(2, '0')
      
      // clients is an object, not an array (using inner join)
      const client: any = visit.clients
      
      return {
        id: visit.id,
        time: `${hours}:${minutes}`,
        clientName: client?.name || 'Unknown',
        service: visit.notes || 'ביקור',
        status: visit.status || 'scheduled',
      }
    }) || []

    return NextResponse.json({
      visits: formattedVisits,
      count: formattedVisits.length,
    })
  } catch (error: any) {
    console.error('Today visits error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch today visits', details: error.message },
      { status: 500 }
    )
  }
}
