import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/wa-inbox/conversations — список всех разговоров
export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId, isAdmin } = auth

  // Inbox — только для системного администратора
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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

// POST /api/wa-inbox/conversations — создать новый разговор вручную
export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId, isAdmin } = auth

  // Inbox — только для системного администратора
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { phone: string; contact_name?: string | null }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const phone = body.phone?.replace(/\D/g, '')
  if (!phone || phone.length < 7) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()

  const { data: conversation, error } = await supabase
    .from('wa_conversations')
    .upsert(
      {
        org_id: orgId,
        phone,
        contact_name: body.contact_name ?? null,
        status: 'new',
        lead_status: 'new',
        last_message_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,phone' }
    )
    .select('id, phone, contact_name, status, lead_status, last_message_at, last_message_text, unread_count, client_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversation })
}
