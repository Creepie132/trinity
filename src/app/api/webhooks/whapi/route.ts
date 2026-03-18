import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// POST /api/webhooks/whapi
// Whapi шлёт сюда все входящие события
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret') ?? req.nextUrl.searchParams.get('token')
  if (secret !== process.env.WHAPI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const messages: any[] = payload?.messages ?? []
  if (messages.length === 0) return NextResponse.json({ ok: true })

  const supabase = createSupabaseServiceClient()

  for (const msg of messages) {
    if (msg.from_me || msg.type === 'status') continue
    const phone = normalizePhone(msg.from ?? msg.chat_id ?? '')
    if (!phone) continue
    await processInboundMessage(supabase, msg, phone)
  }

  return NextResponse.json({ ok: true })
}

// Нормализуем телефон: убираем @s.whatsapp.net, оставляем только цифры
function normalizePhone(raw: string): string {
  return raw.replace('@s.whatsapp.net', '').replace(/\D/g, '')
}

// Основная логика обработки входящего сообщения
async function processInboundMessage(supabase: any, msg: any, phone: string) {
  const body = msg.text?.body ?? msg.caption ?? ''
  const contactName = msg.from_name ?? msg.notify ?? null
  const whapiMsgId = msg.id ?? null

  // 1. Найти org по номеру instance через wa_integrations
  const { data: integration } = await supabase
    .from('wa_integrations')
    .select('org_id')
    .eq('instance_id', msg.instance_id ?? '')
    .eq('is_active', true)
    .single()

  if (!integration?.org_id) return
  const orgId = integration.org_id

  // 2. Upsert разговора
  const { data: conversation, error: convError } = await supabase
    .from('wa_conversations')
    .upsert(
      {
        org_id: orgId,
        phone,
        contact_name: contactName,
        last_message_at: new Date().toISOString(),
        last_message_text: body.slice(0, 200),
        status: 'new',
      },
      { onConflict: 'org_id,phone' }
    )
    .select('id, unread_count')
    .single()

  if (convError || !conversation) return

  // 3. Увеличить счётчик непрочитанных
  await supabase
    .from('wa_conversations')
    .update({ unread_count: (conversation.unread_count ?? 0) + 1 })
    .eq('id', conversation.id)

  // 4. Сохранить сообщение (игнорируем дубликаты)
  await supabase
    .from('wa_messages')
    .upsert(
      {
        conversation_id: conversation.id,
        org_id: orgId,
        whapi_message_id: whapiMsgId,
        direction: 'inbound',
        message_type: msg.type ?? 'text',
        body,
        media_url: msg.image?.link ?? msg.audio?.link ?? msg.document?.link ?? null,
        status: 'received',
      },
      { onConflict: 'whapi_message_id', ignoreDuplicates: true }
    )
}
