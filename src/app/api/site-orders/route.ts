import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

const PAGE_SIZE = 20

// GET /api/site-orders?page=0&status=new
export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const { searchParams } = new URL(req.url)
  const page   = Math.max(0, parseInt(searchParams.get('page') || '0'))
  const status = searchParams.get('status')

  const supabase = createSupabaseServiceClient()

  let query = supabase
    .from('site_orders')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ orders: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE })
}
