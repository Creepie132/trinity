import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// POST /api/webhooks/whapi?token=SECRET&org_id=ORG_ID
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret') ?? req.nextUrl.searchParams.get('token')
  if (secret !== process.env.WHAPI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('org_id')
  if (!orgId) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('[whapi webhook] payload keys:', Object.keys(payload))
  console.log('[whapi webhook] messages count:', payload?.messages?.length ?? 0)

  const messages: any[] = payload?.messages ?? []
  const statuses: any[] = payload?.statuses ?? []

  const supabase = createSupabaseServiceClient()

  // Обрабатываем статусы доставки/прочтения
  for (const status of statuses) {
    const whapiMsgId = status.id
    const newStatus = status.status
    if (!whapiMsgId || !newStatus) continue
    await supabase
      .from('wa_messages')
      .update({ status: newStatus })
      .eq('whapi_message_id', whapiMsgId)
      .eq('org_id', orgId)
  }

  // Typing indicator
  const typingEvents: any[] = payload?.presences ?? []
  for (const event of typingEvents) {
    const phone = normalizePhone(event.chat_id ?? '')
    if (!phone) continue
    const isTyping = event.type === 'composing'
    await supabase
      .from('wa_conversations')
      .update({ is_typing: isTyping })
      .eq('org_id', orgId)
      .eq('phone', phone)
  }

  if (messages.length === 0 && statuses.length === 0) return NextResponse.json({ ok: true })

  for (const msg of messages) {
    // Пропускаем системные broadcast/story
    if (msg.type === 'status') continue

    const isOutgoing = msg.from_me === true

    // Входящее: msg.from = телефон клиента
    // Исходящее: msg.chat_id = телефон клиента (кому отправили)
    const rawPhone = isOutgoing
      ? (msg.chat_id ?? msg.to ?? '')
      : (msg.from ?? msg.chat_id ?? '')

    const phone = normalizePhone(rawPhone)
    if (!phone) continue

    await processMessage(supabase, msg, phone, orgId, isOutgoing)
  }

  return NextResponse.json({ ok: true })
}

// 972524024447@s.whatsapp.net → 0524024447
function normalizePhone(raw: string): string {
  let phone = raw.replace(/@.+/, '').replace(/\D/g, '')
  if (phone.startsWith('972')) phone = '0' + phone.slice(3)
  return phone
}

async function processMessage(
  supabase: any,
  msg: any,
  phone: string,
  orgId: string,
  isOutgoing: boolean,
) {
  const body = msg.text?.body ?? msg.caption ?? ''
  const contactName = isOutgoing ? null : (msg.from_name ?? msg.notify ?? msg.pushname ?? null)
  const whapiMsgId = msg.id ?? null

  console.log(`[whapi] ${isOutgoing ? 'outgoing' : 'inbound'} ${phone}, body: "${body}", msgId: ${whapiMsgId}`)

  const upsertData: Record<string, any> = {
    org_id: orgId,
    phone,
    last_message_at: new Date().toISOString(),
    last_message_text: body.slice(0, 200),
  }
  // Имя контакта обновляем только для входящих
  if (contactName) upsertData.contact_name = contactName

  const { data: conversation, error: convError } = await supabase
    .from('wa_conversations')
    .upsert(upsertData, { onConflict: 'org_id,phone' })
    .select('id, unread_count')
    .single()

  if (convError || !conversation) {
    console.error('[whapi] conversation upsert error:', convError)
    return
  }

  // Счётчик непрочитанных — только входящие
  if (!isOutgoing) {
    await supabase
      .from('wa_conversations')
      .update({ unread_count: (conversation.unread_count ?? 0) + 1 })
      .eq('id', conversation.id)
  }

  // Idempotent: onConflict whapi_message_id ignoreDuplicates
  const { error: msgError } = await supabase
    .from('wa_messages')
    .upsert(
      {
        conversation_id: conversation.id,
        org_id: orgId,
        whapi_message_id: whapiMsgId,
        direction: isOutgoing ? 'outbound' : 'inbound',
        message_type: msg.type ?? 'text',
        body,
        media_url: msg.image?.link ?? msg.audio?.link ?? msg.document?.link ?? null,
        status: isOutgoing ? 'sent' : 'received',
      },
      { onConflict: 'whapi_message_id', ignoreDuplicates: true },
    )

  if (msgError) console.error('[whapi] message insert error:', msgError)
  else console.log(`[whapi] ${isOutgoing ? 'outgoing' : 'inbound'} message saved OK`)
}
