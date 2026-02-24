import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/clients - список клиентов для текущей организации
export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Получаем org_id пользователя
  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!orgUser) {
    return NextResponse.json({ error: 'No organization' }, { status: 403 })
  }

  // Получаем всех клиентов организации (только нужные поля)
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, phone, email')
    .eq('org_id', orgUser.org_id)
    .order('name', { ascending: true })
    .limit(100)

  if (error) {
    console.error('Get clients error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(clients || [])
}
