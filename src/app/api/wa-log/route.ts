/**
 * GET /api/wa-log
 * Лог отправленных WhatsApp-сообщений (из audit_log, action=send_wa).
 * Query params: page (default 1), limit (default 10)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const { searchParams } = req.nextUrl
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '10')))
  const from  = (page - 1) * limit

  const supabase = createSupabaseServiceClient()

  const { data, error, count } = await supabase
    .from('audit_log')
    .select('id, entity_type, new_data, created_at', { count: 'exact' })
    .eq('org_id', orgId)
    .eq('action', 'send_wa')
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    logs:       data ?? [],
    total:      count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  })
}
