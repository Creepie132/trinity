import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// POST /api/webhooks/whapi?token=SECRET&org_id=ORG_ID
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret') ?? req.nextUrl.searchParams.get('token')
  if (secret !== process.env.WHAPI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // org_id передаём прямо в URL — надёжно и просто
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

  // Логируем payload для отладки
  console.log('[whapi webhook] payload keys:', Object.keys(payload))
  console.log('[whapi webhook] messages count:', payload?.messages?.length ?? 0)

  const messages: any[] = payload?.messages ?? []
  if (messages.length === 0) return NextResponse.json({ ok: true })

  const supabase = createSupabaseServiceClient()

  for (const msg of messages) {
    if (msg.from_me === true || msg.type === 'status') continue
    const phone = normalizePhone(msg.from ?? msg.chat_id ?? '')
    if (!phone) continue
    await processInboundMessage(supabase, msg, phone, orgId)
  }

  return NextResponse.json({ ok: true })
}

function normalizePhone(raw: string): string {
  return raw.replace('@s.whatsapp.net', '').replace(/\D/g, '')
}

async function processInboundMessage(supabase: any, msg: any, phone: string, orgId: string) {
  const body = msg.text?.body ?? msg.caption ?? ''
  const contactName = msg.from_name ?? msg.notify ?? msg.pushname ?? null
  const whapiMsgId = msg.id ?? null

  console.log(`[whapi] inbound from ${phone}, body: "${body}", msgId: ${whapiMsgId}`)

  // Upsert разговора
  const { data: conversation, error: convError } = await supabase
    .from('wa_conversations')
    .upsert(
      {
        org_id: orgId,
        phone,
        contact_name: contactName,
        last_message_at: new Date().toISOString(),
        last_message_text: body.slice(0, 200),
      },
      { onConflict: 'org_id,phone' }
    )
    .select('id, unread_count')
    .single()

  if (convError || !conversation) {
    console.error('[whapi] conversation upsert error:', convError)
    return
  }

  // Увеличить счётчик непрочитанных
  await supabase
    .from('wa_conversations')
    .update({ unread_count: (conversation.unread_count ?? 0) + 1 })
    .eq('id', conversation.id)

  // Сохранить сообщение
  const { error: msgError } = await supabase
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

  if (msgError) console.error('[whapi] message insert error:', msgError)
  else console.log('[whapi] message saved OK')
}
