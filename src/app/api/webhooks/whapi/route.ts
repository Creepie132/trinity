import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

// POST /api/webhooks/whapi?token=SECRET&org_id=ORG_ID  → клиент Trinity
// POST /api/webhooks/whapi?token=SECRET                → личный номер Влада
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

  const orgId = req.nextUrl.searchParams.get('org_id')

  // ── Роутинг: личный номер vs клиент Trinity ──────────────────────────────
  if (!orgId) {
    const messages: any[] = payload?.messages ?? []
    for (const msg of messages) {
      await handlePersonalMessage(msg).catch(err =>
        console.error('[personal-bot] error:', err)
      )
    }
    return NextResponse.json({ ok: true })
  }

  // ── Клиент Trinity (существующая логика) ─────────────────────────────────
  console.log('[whapi webhook] org:', orgId, 'messages:', payload?.messages?.length ?? 0)

  const messages: any[] = payload?.messages ?? []
  const statuses: any[] = payload?.statuses ?? []
  const supabase = createSupabaseServiceClient()

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
    if (msg.type === 'status') continue
    const isOutgoing = msg.from_me === true
    const rawPhone = isOutgoing
      ? (msg.chat_id ?? msg.to ?? '')
      : (msg.from ?? msg.chat_id ?? '')
    const phone = normalizePhone(rawPhone)
    if (!phone) continue
    await processOrgMessage(supabase, msg, phone, orgId, isOutgoing)
  }

  return NextResponse.json({ ok: true })
}

// ═══════════════════════════════════════════════════════════════════════════
// ЛИЧНЫЙ БОТ ВЛАДА
// ═══════════════════════════════════════════════════════════════════════════

const WHAPI_TOKEN  = process.env.PERSONAL_BOT_WHAPI_TOKEN!
const WHAPI_BASE   = 'https://gate.whapi.cloud'
const BOT_OWNER    = process.env.PERSONAL_BOT_OWNER_PHONE ?? '972524024447'
const HELP_TEXT    = '📋 Команды:\n/pause [мин] — выключить\n/resume — включить\n/status — статус\n/silence [мин] — тишина в этом чате'

async function handlePersonalMessage(msg: any) {
  const chatId   = msg.chat_id ?? msg.from ?? ''
  const isFromMe = msg.from_me === true
  const body     = (msg.text?.body ?? msg.caption ?? '').trim()
  if (!chatId || !body) return

  const supabase = createSupabaseServiceClient()

  if (isFromMe) {
    await handleOwnerReply(supabase, chatId, body)
    return
  }

  // Rate limit: 5 ответов за 5 минут
  const windowStart = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('personal_bot_logs')
    .select('*', { count: 'exact', head: true })
    .eq('chat_id', chatId).eq('direction', 'outbound').gte('created_at', windowStart)
  if ((count ?? 0) >= 5) {
    await botLog(supabase, chatId, 'skipped', 'rate_limit', body)
    return
  }

  const { data: cfg } = await supabase
    .from('personal_bot_config').select('*').eq('id', 1).single()
  const config = cfg ?? { is_paused: false, paused_until: null, night_mode_start: 23, night_mode_end: 8, silence_after_owner_reply_minutes: 30 }

  // Глобальная пауза
  if (config.is_paused) {
    const stillPaused = !config.paused_until || new Date(config.paused_until) > new Date()
    if (stillPaused) { await botLog(supabase, chatId, 'skipped', 'paused', body); return }
    await supabase.from('personal_bot_config').update({ is_paused: false, paused_until: null }).eq('id', 1)
  }

  // Ночной режим (UTC+3)
  const hour = (new Date().getUTCHours() + 3) % 24
  const isNight = isNightTime(hour, config.night_mode_start, config.night_mode_end)

  // Тишина для чата
  const { data: session } = await supabase
    .from('personal_bot_sessions').select('silent_until').eq('chat_id', chatId).maybeSingle()
  if (session?.silent_until && new Date(session.silent_until) > new Date()) {
    await botLog(supabase, chatId, 'skipped', 'silent', body)
    return
  }

  // Классификация
  const classification = await classifyMessage(body)
  if (classification.intent === 'personal') {
    await botLog(supabase, chatId, 'skipped', 'personal', body, classification.language, 'personal')
    return
  }

  const responseText = await generateBotResponse(body, classification, isNight)

  await setTyping(chatId)
  await sleep(4000 + Math.random() * 11000)
  await sendWhatsapp(chatId, responseText)
  await botLog(supabase, chatId, 'outbound', null, body, classification.language, classification.intent, responseText)
}


async function handleOwnerReply(supabase: any, chatId: string, body: string) {
  if (body.startsWith('/')) {
    const parts = body.trim().split(' ')
    const cmd = parts[0]
    const arg = parts[1] ? parseInt(parts[1]) : null

    if (cmd === '/pause') {
      const pausedUntil = arg ? new Date(Date.now() + arg * 60 * 1000).toISOString() : null
      await supabase.from('personal_bot_config').update({ is_paused: true, paused_until: pausedUntil }).eq('id', 1)
      await sendWhatsapp(BOT_OWNER, arg ? `⏸ Пауза на ${arg} мин.` : '⏸ Пауза до /resume')
    } else if (cmd === '/resume') {
      await supabase.from('personal_bot_config').update({ is_paused: false, paused_until: null }).eq('id', 1)
      await sendWhatsapp(BOT_OWNER, '▶️ Бот активен.')
    } else if (cmd === '/status') {
      const { data: c } = await supabase.from('personal_bot_config').select('*').eq('id', 1).single()
      const until = c?.paused_until ? ` до ${new Date(c.paused_until).toLocaleString('ru')}` : ''
      await sendWhatsapp(BOT_OWNER, c?.is_paused ? `⏸ Пауза${until}` : '✅ Бот активен')
    } else if (cmd === '/silence' && arg) {
      const silentUntil = new Date(Date.now() + arg * 60 * 1000).toISOString()
      await supabase.from('personal_bot_sessions').upsert({ chat_id: chatId, silent_until: silentUntil }, { onConflict: 'chat_id' })
      await sendWhatsapp(BOT_OWNER, `🤫 Тишина ${arg} мин.`)
    } else if (cmd === '/help') {
      await sendWhatsapp(BOT_OWNER, HELP_TEXT)
    }
    return
  }

  // Владелец ответил в чат → тишина N минут
  const { data: c } = await supabase.from('personal_bot_config').select('silence_after_owner_reply_minutes').eq('id', 1).single()
  const minutes = c?.silence_after_owner_reply_minutes ?? 30
  const silentUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString()
  await supabase.from('personal_bot_sessions').upsert(
    { chat_id: chatId, silent_until: silentUntil, last_owner_reply_at: new Date().toISOString() },
    { onConflict: 'chat_id' }
  )
}

async function classifyMessage(body: string): Promise<{ language: string; intent: string }> {
  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: 0,
      maxOutputTokens: 50,
      system: `Классификатор. Ответь ТОЛЬКО валидным JSON без markdown.
Формат: {"language":"ru|he|en","intent":"business|personal"}
business = CRM, разработка, сайты, цены, технологии, сотрудничество.
personal = семья, друзья, праздники, эмоции, small-talk.`,
      prompt: body,
    })
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { language: 'ru', intent: 'business' }
  }
}

async function generateBotResponse(body: string, cls: { language: string; intent: string }, isNight: boolean): Promise<string> {
  const lang = ({ ru: 'русском', he: 'иврите', en: 'английском' } as Record<string, string>)[cls.language] ?? 'русском'
  const system = isNight
    ? `Ты ИИ-ассистент Влада (CEO Amber Solutions). Сейчас ночь. Ответь на ${lang}: подтверди получение, скажи что Влад ответит утром. Максимум 2 предложения.`
    : `Ты ИИ-ассистент Влада (CEO Amber Solutions, Израиль). Продукт: Trinity CRM для малого бизнеса. Отвечай на ${lang}. Кратко, профессионально. Если не знаешь точно — скажи что Влад уточнит лично. Не притворяйся человеком.`
  try {
    const { text } = await generateText({ model: openai('gpt-4o-mini'), temperature: 0.7, maxOutputTokens: 300, system, prompt: body })
    return text
  } catch {
    return 'Получил ваше сообщение, Влад ответит в ближайшее время.'
  }
}


async function setTyping(chatId: string) {
  try {
    await fetch(`${WHAPI_BASE}/chats/${encodeURIComponent(chatId)}/typing`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WHAPI_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ typing: true })
    })
  } catch { /* не критично */ }
}

async function sendWhatsapp(chatId: string, text: string) {
  const res = await fetch(`${WHAPI_BASE}/messages/text`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WHAPI_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: chatId, body: text })
  })
  if (!res.ok) throw new Error(`sendWhatsapp failed: ${res.status} ${await res.text()}`)
}

async function botLog(
  supabase: any, chatId: string, direction: string, reason: string | null,
  messagePreview: string, language?: string, intent?: string, responsePreview?: string
) {
  await supabase.from('personal_bot_logs').insert({
    chat_id: chatId, direction, reason,
    detected_language: language ?? null,
    detected_intent: intent ?? null,
    message_preview: messagePreview.slice(0, 100),
    response_preview: responsePreview?.slice(0, 100) ?? null
  })
}

function isNightTime(hour: number, start: number, end: number): boolean {
  if (start > end) return hour >= start || hour < end
  return hour >= start && hour < end
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ═══════════════════════════════════════════════════════════════════════════
// КЛИЕНТ TRINITY (существующие функции)
// ═══════════════════════════════════════════════════════════════════════════

function normalizePhone(raw: string): string {
  let phone = raw.replace(/@.+/, '').replace(/\D/g, '')
  if (phone.startsWith('972')) phone = '0' + phone.slice(3)
  return phone
}

async function processOrgMessage(
  supabase: any, msg: any, phone: string, orgId: string, isOutgoing: boolean,
) {
  const body = msg.text?.body ?? msg.caption ?? ''
  const contactName = isOutgoing ? null : (msg.from_name ?? msg.notify ?? msg.pushname ?? null)
  const whapiMsgId = msg.id ?? null

  console.log(`[whapi] ${isOutgoing ? 'outgoing' : 'inbound'} ${phone}, body: "${body}", msgId: ${whapiMsgId}`)

  const upsertData: Record<string, any> = {
    org_id: orgId, phone,
    last_message_at: new Date().toISOString(),
    last_message_text: body.slice(0, 200),
  }
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

  if (!isOutgoing) {
    await supabase
      .from('wa_conversations')
      .update({ unread_count: (conversation.unread_count ?? 0) + 1 })
      .eq('id', conversation.id)
  }

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
