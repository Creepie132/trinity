import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ count: 0 })
  }

  // Get user's organization
  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!orgUser) {
    return NextResponse.json({ count: 0 })
  }

  // Count clients
  const { count } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgUser.org_id)

  return NextResponse.json({ count: count || 0 })
}
