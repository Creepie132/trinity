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

  // Получаем телефон разговора
  const { data: conv } = await supabase
    .from('wa_conversations')
    .select('phone')
    .eq('id', conversation_id)
    .eq('org_id', orgId)
    .single()

  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Читаем API ключ через SECURITY DEFINER функцию
  const { data: apiKey, error: keyError } = await supabase
    .rpc('get_wa_api_key', { p_org_id: orgId })

  if (keyError || !apiKey) {
    console.error('[send] API key error:', keyError)
    return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 })
  }

  // Конвертируем телефон в международный формат для Whapi
  // 0524024447 → 972524024447
  let phone = conv.phone.replace(/\D/g, '')
  if (phone.startsWith('0')) phone = '972' + phone.slice(1)
  if (!phone.startsWith('972')) phone = '972' + phone

  // Отправляем через Whapi
  const whapiRes = await fetch('https://gate.whapi.cloud/messages/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ to: phone + '@s.whatsapp.net', body: message }),
  })

  if (!whapiRes.ok) {
    const err = await whapiRes.text()
    console.error('[send] Whapi error:', err)
    return NextResponse.json({ error: `Whapi error: ${err}` }, { status: 500 })
  }

  const whapiData = await whapiRes.json()

  // Сохраняем исходящее сообщение и возвращаем реальный id
  const { data: savedMsg } = await supabase
    .from('wa_messages')
    .insert({
      conversation_id,
      org_id: orgId,
      whapi_message_id: whapiData.message?.id ?? null,
      direction: 'outbound',
      message_type: 'text',
      body: message,
      status: 'sent',
      sent_by_user_id: user.id,
    })
    .select('id, status, created_at, direction, message_type, body')
    .single()

  // Обновляем last_message
  await supabase
    .from('wa_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_text: message.slice(0, 200),
    })
    .eq('id', conversation_id)

  // Возвращаем реальный id — фронт заменит им temp сообщение
  return NextResponse.json({ ok: true, message: savedMsg ?? null })
}
