import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/wa-inbox/conversations — список всех разговоров
export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const url = req.nextUrl
  const status = url.searchParams.get('status') // new|in_progress|waiting|closed
  const leadStatus = url.searchParams.get('lead_status')
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const limit = 20

  const supabase = createSupabaseServiceClient()

  let query = supabase
    .from('wa_conversations')
    .select(`
      id, phone, contact_name, status, lead_status,
      last_message_at, last_message_text, unread_count,
      client_id,
      clients(id, first_name, last_name)
    `, { count: 'exact' })
    .eq('org_id', orgId)
    .order('last_message_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (status) query = query.eq('status', status)
  if (leadStatus) query = query.eq('lead_status', leadStatus)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversations: data ?? [], total: count ?? 0, page, limit })
}
