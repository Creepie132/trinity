import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/org-users - список пользователей текущей организации
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: orgUser } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!orgUser) return NextResponse.json({ error: 'No organization' }, { status: 403 })

    const { data, error } = await supabase
      .from('org_users')
      .select('user_id, full_name, role')
      .eq('org_id', orgUser.org_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data || [])
  } catch (e: any) {
    console.error('Org users catch:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
