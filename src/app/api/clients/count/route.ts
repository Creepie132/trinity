import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await getAuthContext()
  if ('error' in auth) return NextResponse.json({ count: 0 })
  
  const { orgId, supabase } = auth

  // Count clients
  const { count } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)

  return NextResponse.json({ count: count || 0 })
}
