import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/payments - список платежей для текущей организации
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    
    const { orgId } = auth
    const serviceSupabase = createSupabaseServiceClient()

    const { data: payments, error } = await serviceSupabase
      .from('payments')
      .select(`
        *,
        clients (
          id, first_name, last_name, phone, email, org_id
        )
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Payments query error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(payments || [])
  } catch (e: any) {
    console.error('GET /api/payments error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
