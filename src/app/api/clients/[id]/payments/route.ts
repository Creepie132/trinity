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
      .from('payments')
      .select('id, amount, status, description, payment_method, created_at')
      .eq('org_id', orgId)
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching client payments:', error)
    return NextResponse.json([], { status: 500 })
  }
}
