import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext()
    if ('error' in auth) return NextResponse.json([], { status: 401 })

    const { orgId, supabase } = auth
    const allHistory = request.nextUrl.searchParams.get('all') === 'true'
    const now = new Date().toISOString()

    let query = supabase
      .from('visits')
      .select(`
        id,
        scheduled_at,
        started_at,
        duration_minutes,
        status,
        notes,
        price,
        service_type,
        created_at,
        services(id, name, name_ru, duration_minutes, price),
        visit_services(id, service_name, service_name_ru, duration_minutes, price)
      `)
      .eq('org_id', orgId)
      .eq('client_id', id)

    if (allHistory) {
      query = query.order('scheduled_at', { ascending: false })
    } else {
      query = query
        .neq('status', 'cancelled')
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
    }

    const { data } = await query.limit(allHistory ? 50 : 10)
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching client visits:', error)
    return NextResponse.json([], { status: 500 })
  }
}
