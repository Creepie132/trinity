import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

export const runtime = 'nodejs'
export const maxDuration = 30

// ─── Клиенты ────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Конфигурация ────────────────────────────────────────────────────────────
const WHAPI_TOKEN = process.env.PERSONAL_BOT_WHAPI_TOKEN!
const WHAPI_BASE  = 'https://gate.whapi.cloud'
const BOT_OWNER   = process.env.PERSONAL_BOT_OWNER_PHONE ?? '972524024447'

// ─── Команды владельца ───────────────────────────────────────────────────────
const HELP_TEXT = '📋 Команды:\n/pause [мин] — выключить\n/resume — включить\n/status — статус\n/silence [мин] — тишина в чате'

// ─── ГЛАВНЫЙ ОБРАБОТЧИК ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.PERSONAL_BOT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: any
  try { payload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const messages: any[] = payload?.messages ?? []
  if (messages.length === 0) return NextResponse.json({ ok: true })

  for (const msg of messages) {
    await handleMessage(msg).catch(err =>
      console.error('[personal-bot] error:', err)
    )
  }

  return NextResponse.json({ ok: true })
}


// ─── ОБРАБОТКА СООБЩЕНИЯ ─────────────────────────────────────────────────────
async function handleMessage(msg: any) {
  const chatId   = msg.chat_id ?? msg.from ?? ''
  const isFromMe = msg.from_me === true
  const body     = (msg.text?.body ?? msg.caption ?? '').trim()

  if (!chatId || !body) return

  // Владелец ответил → управление тишиной
  if (isFromMe) {
    await handleOwnerReply(chatId, body)
    return
  }

  // Rate limit: не более 5 ответов за 5 минут на один чат
  if (await checkRateLimit(chatId)) {
    await log(chatId, 'skipped', 'rate_limit', body)
    return
  }

  const config = await getBotConfig()

  // Глобальная пауза
  if (config.is_paused) {
    const stillPaused = !config.paused_until || new Date(config.paused_until) > new Date()
    if (stillPaused) {
      await log(chatId, 'skipped', 'paused', body)
      return
    }
    await supabase.from('personal_bot_config')
      .update({ is_paused: false, paused_until: null }).eq('id', 1)
  }

  // Ночной режим (UTC+3 Israel)
  const hour = (new Date().getUTCHours() + 3) % 24
  const isNight = isNightTime(hour, config.night_mode_start, config.night_mode_end)

  // Тишина для конкретного чата
  const session = await getChatSession(chatId)
  if (session?.silent_until && new Date(session.silent_until) > new Date()) {
    await log(chatId, 'skipped', 'silent', body)
    return
  }

  // Классификация
  const classification = await classify(body)

  // Личное — не отвечаем
  if (classification.intent === 'personal') {
    await log(chatId, 'skipped', 'personal', body, classification.language, 'personal')
    return
  }

  // Генерация ответа
  const responseText = await generateResponse(body, classification, isNight)

  // Typing + задержка 4–15 сек
  await setTyping(chatId)
  await sleep(4000 + Math.random() * 11000)

  await sendMessage(chatId, responseText)
  await log(chatId, 'outbound', null, body, classification.language, classification.intent, responseText)
}


// ─── ВЛАДЕЛЕЦ ОТВЕТИЛ ────────────────────────────────────────────────────────
async function handleOwnerReply(chatId: string, body: string) {
  if (body.startsWith('/')) {
    await handleCommand(chatId, body)
    return
  }
  const { data: cfg } = await supabase
    .from('personal_bot_config')
    .select('silence_after_owner_reply_minutes').eq('id', 1).single()
  const minutes = cfg?.silence_after_owner_reply_minutes ?? 30
  const silentUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString()
  await supabase.from('personal_bot_sessions').upsert(
    { chat_id: chatId, silent_until: silentUntil, last_owner_reply_at: new Date().toISOString() },
    { onConflict: 'chat_id' }
  )
}

// ─── КОМАНДЫ ─────────────────────────────────────────────────────────────────
async function handleCommand(chatId: string, body: string) {
  const parts = body.trim().split(' ')
  const cmd = parts[0]
  const arg = parts[1] ? parseInt(parts[1]) : null

  if (cmd === '/pause') {
    const pausedUntil = arg ? new Date(Date.now() + arg * 60 * 1000).toISOString() : null
    await supabase.from('personal_bot_config')
      .update({ is_paused: true, paused_until: pausedUntil }).eq('id', 1)
    await sendMessage(BOT_OWNER, arg ? `⏸ Пауза на ${arg} мин.` : '⏸ Пауза до /resume')
  } else if (cmd === '/resume') {
    await supabase.from('personal_bot_config')
      .update({ is_paused: false, paused_until: null }).eq('id', 1)
    await sendMessage(BOT_OWNER, '▶️ Бот активен.')
  } else if (cmd === '/status') {
    const { data: cfg } = await supabase.from('personal_bot_config').select('*').eq('id', 1).single()
    const paused = cfg?.is_paused
    const until = cfg?.paused_until ? ` до ${new Date(cfg.paused_until).toLocaleString('ru')}` : ''
    await sendMessage(BOT_OWNER, paused ? `⏸ Пауза${until}` : '✅ Бот активен')
  } else if (cmd === '/silence' && arg) {
    const silentUntil = new Date(Date.now() + arg * 60 * 1000).toISOString()
    await supabase.from('personal_bot_sessions').upsert(
      { chat_id: chatId, silent_until: silentUntil },
      { onConflict: 'chat_id' }
    )
    await sendMessage(BOT_OWNER, `🤫 Тишина ${arg} мин.`)
  } else if (cmd === '/help') {
    await sendMessage(BOT_OWNER, HELP_TEXT)
  }
}


// ─── КЛАССИФИКАЦИЯ ───────────────────────────────────────────────────────────
async function classify(body: string): Promise<{ language: string; intent: string }> {
  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: 0,
      maxOutputTokens: 50,
      system: `Ты классификатор. Ответь ТОЛЬКО валидным JSON без markdown.
Формат: {"language":"ru|he|en","intent":"business|personal"}
business = CRM, разработка, сайты, цены, технологии, сотрудничество.
personal = семья, друзья, праздники, эмоции, small-talk.`,
      prompt: body,
    })
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { language: 'ru', intent: 'business' }
  }
}

// ─── ГЕНЕРАЦИЯ ОТВЕТА ────────────────────────────────────────────────────────
async function generateResponse(
  body: string,
  classification: { language: string; intent: string },
  isNight: boolean
): Promise<string> {
  const langMap: Record<string, string> = { ru: 'русском', he: 'иврите', en: 'английском' }
  const lang = langMap[classification.language] ?? 'русском'

  const system = isNight
    ? `Ты ИИ-ассистент Влада (CEO Amber Solutions). Сейчас ночь. Ответь на ${lang}: подтверди получение, скажи что Влад ответит утром. Максимум 2 предложения.`
    : `Ты ИИ-ассистент Влада (CEO Amber Solutions, Израиль). Продукт: Trinity CRM для малого бизнеса.
Отвечай на ${lang}. Кратко, профессионально. Если не знаешь точно — скажи что Влад уточнит лично. Не притворяйся человеком.`

  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: 0.7,
      maxOutputTokens: 300,
      system,
      prompt: body,
    })
    return text
  } catch {
    return 'Получил ваше сообщение, Влад ответит в ближайшее время.'
  }
}

// ─── RATE LIMIT ──────────────────────────────────────────────────────────────
async function checkRateLimit(chatId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('personal_bot_logs')
    .select('*', { count: 'exact', head: true })
    .eq('chat_id', chatId).eq('direction', 'outbound').gte('created_at', windowStart)
  return (count ?? 0) >= 5
}


// ─── WHAPI ───────────────────────────────────────────────────────────────────
async function setTyping(chatId: string) {
  try {
    await fetch(`${WHAPI_BASE}/chats/${encodeURIComponent(chatId)}/typing`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WHAPI_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ typing: true })
    })
  } catch { /* не критично */ }
}

async function sendMessage(chatId: string, text: string) {
  const res = await fetch(`${WHAPI_BASE}/messages/text`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WHAPI_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: chatId, body: text })
  })
  if (!res.ok) throw new Error(`sendMessage failed: ${res.status} ${await res.text()}`)
}

// ─── SUPABASE HELPERS ────────────────────────────────────────────────────────
async function getChatSession(chatId: string) {
  const { data } = await supabase
    .from('personal_bot_sessions').select('silent_until')
    .eq('chat_id', chatId).maybeSingle()
  return data
}

async function getBotConfig() {
  const { data } = await supabase
    .from('personal_bot_config').select('*').eq('id', 1).single()
  return data ?? {
    is_paused: false, paused_until: null,
    night_mode_start: 23, night_mode_end: 8,
    silence_after_owner_reply_minutes: 30
  }
}

// ─── УТИЛИТЫ ─────────────────────────────────────────────────────────────────
function isNightTime(hour: number, start: number, end: number): boolean {
  if (start > end) return hour >= start || hour < end
  return hour >= start && hour < end
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function log(
  chatId: string, direction: string, reason: string | null,
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
