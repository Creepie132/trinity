import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error

    const { orgId } = auth
    const serviceSupabase = createSupabaseServiceClient()

    const { data: payment, error } = await serviceSupabase
      .from('payments')
      .select(`*, clients(id, first_name, last_name, phone, email)`)
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (error || !payment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ payment })
  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
