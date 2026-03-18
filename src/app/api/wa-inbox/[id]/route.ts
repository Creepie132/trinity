import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

type Params = { params: Promise<{ id: string }> }

// GET /api/wa-inbox/[id] — сообщения разговора
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth
  const supabase = createSupabaseServiceClient()

  await supabase
    .from('wa_conversations')
    .update({ unread_count: 0 })
    .eq('id', id)
    .eq('org_id', orgId)

  const { data: messages, error } = await supabase
    .from('wa_messages')
    .select('id, direction, message_type, body, media_url, status, created_at, sent_by_user_id')
    .eq('conversation_id', id)
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: messages ?? [] })
}

// PATCH /api/wa-inbox/[id] — обновить статус / привязать клиента
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  let body: { status?: string; lead_status?: string; client_id?: string | null }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowed_status = ['new', 'in_progress', 'waiting', 'closed']
  const allowed_lead = ['new', 'contacted', 'demo_scheduled', 'converted', 'lost']

  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  if (body.status && allowed_status.includes(body.status)) update.status = body.status
  if (body.lead_status && allowed_lead.includes(body.lead_status)) update.lead_status = body.lead_status
  if ('client_id' in body) update.client_id = body.client_id ?? null

  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('wa_conversations')
    .update(update)
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
