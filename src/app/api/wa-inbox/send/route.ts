import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { sendWhatsAppMessage } from '@/lib/wa/send'

// POST /api/wa-inbox/send — отправить ответ клиенту из Trinity
// Использует Fallback-паттерн: custom org → org-level → global ENV
export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId, user, isAdmin } = auth
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

  // ── Отправляем через центральную утилиту (Fallback: custom → org → env) ──
  const sendResult = await sendWhatsAppMessage({
    orgId,
    to:      conv.phone,
    message,
    softFail: true,
  })

  if (!sendResult.ok) {
    console.error('[wa-inbox/send] send failed:', sendResult.error, 'provider:', sendResult.provider)
    return NextResponse.json(
      { error: sendResult.error ?? 'WhatsApp not configured' },
      { status: sendResult.provider === 'none' ? 400 : 500 }
    )
  }

  // Сохраняем исходящее сообщение
  const { data: savedMsg } = await supabase
    .from('wa_messages')
    .insert({
      conversation_id,
      org_id:           orgId,
      whapi_message_id: sendResult.messageId ?? null,
      direction:        'outbound',
      message_type:     'text',
      body:             message,
      status:           'sent',
      sent_by_user_id:  user.id,
    })
    .select('id, status, created_at, direction, message_type, body')
    .single()

  // Обновляем last_message
  await supabase
    .from('wa_conversations')
    .update({
      last_message_at:   new Date().toISOString(),
      last_message_text: message.slice(0, 200),
    })
    .eq('id', conversation_id)

  return NextResponse.json({ ok: true, message: savedMsg ?? null, provider: sendResult.provider })
}
