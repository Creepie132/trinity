import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

// GET /api/payments - список платежей для текущей организации
export async function GET() {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { orgId, supabase } = auth

    // Получаем платежи через JOIN с clients для фильтрации по org_id
    // NOTE: payments table doesn't have org_id, need to join through clients
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*, clients!inner(org_id)')
      .eq('clients.org_id', orgId)
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
