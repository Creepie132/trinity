import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/wa-stats — статистика очереди для текущей org
export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const supabase = createSupabaseServiceClient()

  const { data, error } = await supabase
    .from('outbound_queue')
    .select('status')
    .eq('org_id', orgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data ?? []
  return NextResponse.json({
    total:   rows.length,
    sent:    rows.filter(r => r.status === 'sent').length,
    pending: rows.filter(r => r.status === 'pending' || r.status === 'processing').length,
    error:   rows.filter(r => r.status === 'error').length,
  })
}
