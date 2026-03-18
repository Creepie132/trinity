import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// POST /api/wa-inbox/send — отправить ответ клиенту из Trinity
export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId, user } = auth

  let body: { conversation_id: string; message: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { conversation_id, message } = body
  if (!conversation_id || !message?.trim()) {
    return NextResponse.json({ error: 'conversation_id and message required' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()

  const { data: conv } = await supabase
    .from('wa_conversations')
    .select('phone')
    .eq('id', conversation_id)
    .eq('org_id', orgId)
    .single()

  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: integration } = await supabase
    .from('wa_integrations')
    .select('instance_id, vault_secret_id')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .single()

  if (!integration) return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 })

  // Читаем ключ из vault.decrypted_secrets
  const { data: secretRow } = await supabase
    .from('vault.decrypted_secrets')
    .select('decrypted_secret')
    .eq('id', integration.vault_secret_id)
    .single()

  const apiKey = secretRow?.decrypted_secret
  if (!apiKey) return NextResponse.json({ error: 'Cannot read API key' }, { status: 500 })

  const whapiRes = await fetch('https://gate.whapi.cloud/messages/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ to: conv.phone + '@s.whatsapp.net', body: message }),
  })

  if (!whapiRes.ok) {
    const err = await whapiRes.text()
    return NextResponse.json({ error: `Whapi error: ${err}` }, { status: 500 })
  }

  const whapiData = await whapiRes.json()

  await supabase.from('wa_messages').insert({
    conversation_id,
    org_id: orgId,
    whapi_message_id: whapiData.message?.id ?? null,
    direction: 'outbound',
    message_type: 'text',
    body: message,
    status: 'sent',
    sent_by_user_id: user.id,
  })

  await supabase
    .from('wa_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_text: message.slice(0, 200),
    })
    .eq('id', conversation_id)

  return NextResponse.json({ ok: true })
}
