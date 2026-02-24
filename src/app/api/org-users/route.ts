import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/org-users - список пользователей текущей организации
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

  // Получаем всех пользователей организации
  const { data: users, error } = await supabase
    .from('org_users')
    .select('user_id, full_name, role')
    .eq('org_id', orgUser.org_id)
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Get org users error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(users || [])
}
