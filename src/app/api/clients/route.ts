import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/clients - список клиентов для текущей организации
export async function GET() {
  try {
    console.log('=== GET /api/clients START ===')
    
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

    // Получаем всех клиентов организации (только нужные поля)
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name, phone, email')
      .eq('org_id', orgUser.org_id)
      .order('name', { ascending: true })
      .limit(100)

    console.log('Query error:', error?.message)
    console.log('Clients count:', clients?.length)
    console.log('First client:', clients?.[0] ? JSON.stringify(clients[0]) : 'none')

    if (error) {
      console.error('❌ Clients query error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Returning', clients?.length || 0, 'clients')
    return NextResponse.json(clients || [])
  } catch (e: any) {
    console.error('❌ Catch error in GET /api/clients:', e.message)
    console.error('Stack:', e.stack)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
