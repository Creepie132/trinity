import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/payments - список платежей для текущей организации
export async function GET() {
  try {
    console.log('=== GET /api/payments START ===')
    
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('User ID:', user?.id)
    console.log('Auth error:', authError?.message)
    
    if (!user) {
      console.log('❌ No user - returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем org_id пользователя
    const { data: orgUser, error: orgError } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    console.log('Org user:', orgUser)
    console.log('Org error:', orgError?.message)

    if (!orgUser) {
      console.log('❌ No organization - returning 403')
      return NextResponse.json({ error: 'No organization' }, { status: 403 })
    }

    console.log('Organization ID:', orgUser.org_id)

    // Получаем платежи через JOIN с clients для фильтрации по org_id
    // NOTE: payments table doesn't have org_id, need to join through clients
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*, clients!inner(org_id)')
      .eq('clients.org_id', orgUser.org_id)
      .order('created_at', { ascending: false })
      .limit(1000)

    console.log('Query error:', error?.message)
    console.log('Payments count:', payments?.length)
    console.log('First payment:', payments?.[0] ? JSON.stringify(payments[0]) : 'none')

    if (error) {
      console.error('❌ Payments query error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Returning', payments?.length || 0, 'payments')
    return NextResponse.json(payments || [])
  } catch (e: any) {
    console.error('❌ Catch error in GET /api/payments:', e.message)
    console.error('Stack:', e.stack)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
