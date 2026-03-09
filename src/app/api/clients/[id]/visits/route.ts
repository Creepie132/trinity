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

    const { data } = await supabase
      .from('visits')
      .select(`
        id, 
        scheduled_at, 
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
      .order('scheduled_at', { ascending: false })
      .limit(20)

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching client visits:', error)
    return NextResponse.json([], { status: 500 })
  }
}
