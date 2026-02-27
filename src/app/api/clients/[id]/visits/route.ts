import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json([], { status: 401 })
    }

    const { data: orgUser } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!orgUser) {
      return NextResponse.json([], { status: 403 })
    }

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
      .eq('org_id', orgUser.org_id)
      .eq('client_id', id)
      .order('scheduled_at', { ascending: false })
      .limit(20)

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching client visits:', error)
    return NextResponse.json([], { status: 500 })
  }
}
