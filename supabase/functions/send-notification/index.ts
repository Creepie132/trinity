/**
 * Edge Function: send-notification
 * Trinity CRM — Notification System 2.0 + I18N (v2.1)
 *
 * Auth: Bearer <service_role JWT> — проверяем role=service_role в JWT payload
 * (не строгое сравнение строк — для устойчивости к ротации ключей)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Locale = 'ru' | 'he'

interface NotifChannels { push: boolean; telegram: boolean; email: boolean }
interface NotificationPreferences { [eventKey: string]: NotifChannels }
interface NotifPayload { title: string; body: string; url?: string; icon?: string }
interface NotifTemplate { key: string; vars?: Record<string, string | number> }
interface SendRequest { event_type: string; org_id: string; template?: NotifTemplate; payload?: Partial<NotifPayload> }
interface WebPushSub { endpoint: string; p256dh: string; auth: string; user_id: string }
interface VapidConfig { privateKey: string; publicKey: string; email: string }
interface DispatchResults { telegramSent: number; pushSent: number; pushExpired: number; errors: string[] }

const DEFAULT_CHANNELS: NotifChannels = { push: true, telegram: false, email: false }
const DEFAULT_LOCALE: Locale = 'ru'

interface TemplateStrings { title: string; body: string; url?: string }
type TemplateDict = Record<string, Record<Locale, TemplateStrings>>

const TEMPLATES: TemplateDict = {
  new_visit: {
    ru: { title: '📅 Новый визит', body: '{time} — {service}', url: '/diary' },
    he: { title: '📅 ביקור נוצר', body: '{time} — {service}', url: '/diary' },
  },
  visit_reminder: {
    ru: { title: '⏰ Напоминание о визите', body: '{client} — через {minutes} мин.', url: '/diary' },
    he: { title: '⏰ תזכורת לביקור', body: '{client} — בעוד {minutes} דקות', url: '/diary' },
  },
  new_payment: {
    ru: { title: '💳 Новый платёж', body: '₪{amount} — {method}', url: '/payments' },
    he: { title: '💳 תשלום חדש', body: '₪{amount} — {method}', url: '/payments' },
  },
  new_client: {
    ru: { title: '👤 Новый клиент', body: '{name}', url: '/clients' },
    he: { title: '👤 לקוח חדש', body: '{name}', url: '/clients' },
  },
  new_order: {
    ru: { title: '🛒 Новый заказ с сайта', body: '{product} ×{qty} — ₪{total}', url: '/site-orders' },
    he: { title: '🛒 הזמנה חדשה מהאתר!', body: '{product} ×{qty} — ₪{total}', url: '/site-orders' },
  },
  stock_alerts: {
    ru: { title: '📦 Низкий остаток', body: '{product} — осталось {qty}', url: '/inventory' },
    he: { title: '📦 מלאי נמוך', body: '{product} — נשארו {qty}', url: '/inventory' },
  },
  task_mentions: {
    ru: { title: '💬 Вас упомянули', body: '{from}: {text}', url: '/diary' },
    he: { title: '💬 הוזכרת במשימה', body: '{from}: {text}', url: '/diary' },
  },
  birthday: {
    ru: { title: '🎂 День рождения', body: 'Сегодня у {name} — поздравьте!', url: '/clients' },
    he: { title: '🎂 יום הולדת', body: 'היום ל-{name} — תברכו!', url: '/clients' },
  },
  ai_fallback: {
    ru: { title: '🤖 Кира просит помощи', body: 'Клиент {client} — нужен оператор', url: '/inbox' },
    he: { title: '🤖 קירה מבקשת עזרה', body: 'הלקוח {client} — דרוש מפעיל', url: '/inbox' },
  },
  security_login: {
    ru: { title: '🔐 Новый вход', body: '{device} · {location}', url: '/settings' },
    he: { title: '🔐 כניסה חדשה', body: '{device} · {location}', url: '/settings' },
  },
}

function interpolate(tpl: string, vars?: Record<string, string | number>): string {
  if (!vars) return tpl
  return tpl.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k]
    return v === undefined || v === null ? '' : String(v)
  })
}

function renderTemplate(template: NotifTemplate, locale: Locale, fallbackUrl?: string): NotifPayload | null {
  const entry = TEMPLATES[template.key]
  if (!entry) return null
  const loc = entry[locale] ?? entry[DEFAULT_LOCALE]
  return {
    title: interpolate(loc.title, template.vars),
    body:  interpolate(loc.body,  template.vars),
    url:   fallbackUrl ?? loc.url,
  }
}

function toLocale(value: unknown): Locale {
  return value === 'he' ? 'he' : 'ru'
}

/**
 * Распарсивает payload из JWT без проверки подписи (нам нужен только role).
 * Подпись JWT проверяется выше на уровне Supabase (если verify_jwt=true)
 * или мы доверяем ранней валидации.
 */
function getJwtRole(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const padded = payload.padEnd(payload.length + (4 - payload.length % 4) % 4, '=')
    const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
    const json = JSON.parse(decoded)
    return typeof json.role === 'string' ? json.role : null
  } catch {
    return null
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  // ────── Auth: проверяем что JWT с ролью service_role ──────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 })
  const token = authHeader.slice(7)
  const role = getJwtRole(token)
  if (role !== 'service_role') {
    console.error('[send-notification] Invalid role in JWT:', role)
    return new Response('Forbidden: service_role required', { status: 403 })
  }

  let body: SendRequest
  try { body = await req.json() } catch { return new Response('Invalid JSON', { status: 400 }) }

  const { event_type, org_id, template, payload: legacyPayload } = body
  if (!event_type || !org_id) return new Response('Missing required fields: event_type, org_id', { status: 400 })
  if (!template && !legacyPayload?.title) return new Response('Either template or payload.title required', { status: 400 })

  // Используем тот же token для Supabase client — он имеет role=service_role, обходит RLS
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabase = createClient(supabaseUrl, token, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const results: DispatchResults = { telegramSent: 0, pushSent: 0, pushExpired: 0, errors: [] }

  const { data: prefRows, error: prefErr } = await supabase
    .from('notification_preferences').select('user_id, preferences').eq('org_id', org_id)
  if (prefErr) { console.error('[send-notification] prefs fetch:', prefErr); return new Response('DB error', { status: 500 }) }

  const telegramUserIds: string[] = []
  const pushUserIds: string[] = []
  for (const row of prefRows ?? []) {
    const prefs = row.preferences as NotificationPreferences
    const channels: NotifChannels = prefs?.[event_type] ?? DEFAULT_CHANNELS
    if (channels.telegram) telegramUserIds.push(row.user_id)
    if (channels.push)     pushUserIds.push(row.user_id)
  }

  const { data: orgRow } = await supabase
    .from('organizations').select('primary_language, telegram_chat_id, telegram_notifications').eq('id', org_id).single()
  const orgDefaultLocale: Locale = toLocale(orgRow?.primary_language)

  const allUserIds = Array.from(new Set([...telegramUserIds, ...pushUserIds]))
  const userLocales = new Map<string, Locale>()
  if (allUserIds.length > 0) {
    const { data: usersLangs } = await supabase
      .from('org_users').select('user_id, preferred_language').eq('org_id', org_id).in('user_id', allUserIds)
    for (const u of usersLangs ?? []) userLocales.set(u.user_id, toLocale(u.preferred_language))
  }
  const getLocale = (userId: string): Locale => userLocales.get(userId) ?? orgDefaultLocale

  function buildPayload(locale: Locale): NotifPayload {
    if (template) {
      const rendered = renderTemplate(template, locale, legacyPayload?.url)
      if (rendered) return { ...rendered, icon: legacyPayload?.icon }
    }
    return {
      title: legacyPayload?.title ?? 'Trinity CRM',
      body:  legacyPayload?.body  ?? '',
      url:   legacyPayload?.url,
      icon:  legacyPayload?.icon,
    }
  }

  if (telegramUserIds.length > 0) {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
    if (orgRow?.telegram_notifications && orgRow?.telegram_chat_id && botToken) {
      const tgPayload = buildPayload(orgDefaultLocale)
      const tgResult = await sendTelegram(orgRow.telegram_chat_id, tgPayload, botToken, orgDefaultLocale)
      if (tgResult.ok) results.telegramSent++
      else results.errors.push(`telegram: ${tgResult.error}`)
    }
  }

  if (pushUserIds.length > 0) {
    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions').select('endpoint, p256dh, auth, user_id').eq('org_id', org_id).in('user_id', pushUserIds)
    if (subErr) results.errors.push(`push_subscriptions: ${subErr.message}`)
    else if (subs && subs.length > 0) {
      const vapid: VapidConfig = {
        privateKey: Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
        publicKey:  Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY') ?? '',
        email:      Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@ambersol.co.il',
      }
      const pushResults = await Promise.allSettled(
        subs.map((sub: WebPushSub) => {
          const locale = getLocale(sub.user_id)
          return sendWebPush(sub, buildPayload(locale), vapid)
        })
      )
      const expiredEndpoints: string[] = []
      pushResults.forEach((result, i) => {
        if (result.status === 'rejected') { results.errors.push(`push[${i}]: ${result.reason}`); return }
        const status = result.value.status
        if (status >= 200 && status < 300) results.pushSent++
        else if (status === 410 || status === 404) { expiredEndpoints.push(subs[i].endpoint); results.pushExpired++ }
        else results.errors.push(`push[${i}]: HTTP ${status}`)
      })
      if (expiredEndpoints.length > 0) {
        await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
      }
    }
  }

  console.log(`[send-notification] event=${event_type} org=${org_id}`, results)
  return new Response(JSON.stringify({ ok: true, ...results }), { headers: { 'Content-Type': 'application/json' } })
})

async function sendTelegram(chatId: string, payload: NotifPayload, botToken: string, locale: Locale): Promise<{ ok: boolean; error?: string }> {
  const openLabel = locale === 'he' ? 'פתח ב-Trinity' : 'Открыть в Trinity'
  const text = [
    `🔔 *${escMd(payload.title)}*`,
    escMd(payload.body),
    payload.url ? `\n[${escMd(openLabel)}](${payload.url})` : '',
  ].filter(Boolean).join('\n')
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2', disable_web_page_preview: true }),
    })
    const data = await res.json()
    if (!data.ok) return { ok: false, error: data.description ?? 'Telegram error' }
    return { ok: true }
  } catch (err) { return { ok: false, error: String(err) } }
}

function escMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&')
}

async function sendWebPush(sub: WebPushSub, payload: NotifPayload, vapid: VapidConfig): Promise<Response> {
  if (!vapid.privateKey || !vapid.publicKey) throw new Error('VAPID keys not configured')
  const message = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    icon:  payload.icon ?? '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data:  { url: payload.url ?? '/dashboard' },
  })
  const jwt = await buildVapidJwt(sub.endpoint, vapid)
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization':  `vapid t=${jwt},k=${vapid.publicKey}`,
      'Content-Type':   'application/json',
      'Content-Length': String(new TextEncoder().encode(message).length),
      'TTL':            '86400',
    },
    body: message,
  })
}

async function buildVapidJwt(endpoint: string, vapid: VapidConfig): Promise<string> {
  const { protocol, host } = new URL(endpoint)
  const audience = `${protocol}//${host}`
  const now = Math.floor(Date.now() / 1000)
  const header  = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const claims  = b64url(JSON.stringify({ aud: audience, exp: now + 43200, sub: vapid.email }))
  const signing = `${header}.${claims}`
  const keyBytes = b64urlDecode(vapid.privateKey)
  const key = await crypto.subtle.importKey('pkcs8', keyBytes, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signing))
  return `${signing}.${b64urlEncode(new Uint8Array(sig))}`
}

function b64url(str: string): string { return b64urlEncode(new TextEncoder().encode(str)) }
function b64urlEncode(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded  = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
  const raw = atob(padded)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}
