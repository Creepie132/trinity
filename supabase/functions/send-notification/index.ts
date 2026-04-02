/**
 * Edge Function: send-notification
 * Trinity CRM — Notification System 2.0
 *
 * POST body: { event_type: string, org_id: string, payload: NotifPayload }
 *
 * 1. Читает notification_preferences для всех юзеров орга
 * 2. Определяет каналы (push / telegram) на событие
 * 3. Отправляет через Telegram Bot API и/или Web Push (VAPID)
 *
 * Auth: Bearer SUPABASE_SERVICE_ROLE_KEY (только internal вызовы)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotifChannels {
  push: boolean
  telegram: boolean
  email: boolean
}

interface NotificationPreferences {
  [eventKey: string]: NotifChannels
}

interface NotifPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

interface SendRequest {
  event_type: string
  org_id: string
  payload: NotifPayload
}

interface WebPushSub {
  endpoint: string
  p256dh: string
  auth: string
}

interface VapidConfig {
  privateKey: string
  publicKey: string
  email: string
}

interface DispatchResults {
  telegramSent: number
  pushSent: number
  pushExpired: number
  errors: string[]
}

const DEFAULT_CHANNELS: NotifChannels = { push: true, telegram: false, email: false }

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (authHeader.slice(7) !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!) {
    return new Response('Forbidden', { status: 403 })
  }

  let body: SendRequest
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { event_type, org_id, payload } = body
  if (!event_type || !org_id || !payload?.title) {
    return new Response('Missing required fields: event_type, org_id, payload.title', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const results: DispatchResults = { telegramSent: 0, pushSent: 0, pushExpired: 0, errors: [] }

  // ── 1. Load notification_preferences for this org ─────────────────────────
  const { data: prefRows, error: prefErr } = await supabase
    .from('notification_preferences')
    .select('user_id, preferences')
    .eq('org_id', org_id)

  if (prefErr) {
    console.error('[send-notification] prefs fetch:', prefErr)
    return new Response('DB error', { status: 500 })
  }

  // ── 2. Build recipient lists per channel ──────────────────────────────────
  const telegramUserIds: string[] = []
  const pushUserIds: string[] = []

  for (const row of prefRows ?? []) {
    const prefs = row.preferences as NotificationPreferences
    const channels: NotifChannels = prefs?.[event_type] ?? DEFAULT_CHANNELS
    if (channels.telegram) telegramUserIds.push(row.user_id)
    if (channels.push)     pushUserIds.push(row.user_id)
  }

  // ── 3. Telegram ───────────────────────────────────────────────────────────
  if (telegramUserIds.length > 0) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('telegram_chat_id, telegram_notifications')
      .eq('id', org_id)
      .single()

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
    if (orgData?.telegram_notifications && orgData?.telegram_chat_id && botToken) {
      const tgResult = await sendTelegram(orgData.telegram_chat_id, payload, botToken)
      if (tgResult.ok) {
        results.telegramSent++
      } else {
        results.errors.push(`telegram: ${tgResult.error}`)
      }
    }
  }

  // ── 4. Web Push ───────────────────────────────────────────────────────────
  if (pushUserIds.length > 0) {
    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('org_id', org_id)
      .in('user_id', pushUserIds)

    if (subErr) {
      results.errors.push(`push_subscriptions: ${subErr.message}`)
    } else if (subs && subs.length > 0) {
      const vapid: VapidConfig = {
        privateKey: Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
        publicKey:  Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY') ?? '',
        email:      Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@ambersol.co.il',
      }

      const pushResults = await Promise.allSettled(
        subs.map((sub: WebPushSub) => sendWebPush(sub, payload, vapid))
      )

      const expiredEndpoints: string[] = []
      pushResults.forEach((result, i) => {
        if (result.status === 'rejected') {
          results.errors.push(`push[${i}]: ${result.reason}`)
          return
        }
        const status = result.value.status
        if (status >= 200 && status < 300) {
          results.pushSent++
        } else if (status === 410 || status === 404) {
          expiredEndpoints.push(subs[i].endpoint)
          results.pushExpired++
        } else {
          results.errors.push(`push[${i}]: HTTP ${status}`)
        }
      })

      if (expiredEndpoints.length > 0) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .in('endpoint', expiredEndpoints)
      }
    }
  }

  console.log(`[send-notification] event=${event_type} org=${org_id}`, results)

  return new Response(JSON.stringify({ ok: true, ...results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// ─── Telegram helper ──────────────────────────────────────────────────────────

async function sendTelegram(
  chatId: string,
  payload: NotifPayload,
  botToken: string,
): Promise<{ ok: boolean; error?: string }> {
  const text = [
    `🔔 *${escMd(payload.title)}*`,
    escMd(payload.body),
    payload.url ? `\n[Открыть в Trinity](${payload.url})` : '',
  ].filter(Boolean).join('\n')

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
    })
    const data = await res.json()
    if (!data.ok) return { ok: false, error: data.description ?? 'Telegram error' }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/** Escape special chars for Telegram MarkdownV2 */
function escMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&')
}

// ─── Web Push (VAPID) ─────────────────────────────────────────────────────────

async function sendWebPush(
  sub: WebPushSub,
  payload: NotifPayload,
  vapid: VapidConfig,
): Promise<Response> {
  if (!vapid.privateKey || !vapid.publicKey) {
    throw new Error('VAPID keys not configured')
  }

  const message = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    icon:  payload.icon ?? '/icon-192.png',
    badge: '/badge-72.png',
    data:  { url: payload.url ?? '/' },
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

// ─── Minimal VAPID JWT (ES256, no external deps) ──────────────────────────────

async function buildVapidJwt(endpoint: string, vapid: VapidConfig): Promise<string> {
  const { protocol, host } = new URL(endpoint)
  const audience = `${protocol}//${host}`
  const now = Math.floor(Date.now() / 1000)

  const header  = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const claims  = b64url(JSON.stringify({ aud: audience, exp: now + 43200, sub: vapid.email }))
  const signing = `${header}.${claims}`

  const keyBytes = b64urlDecode(vapid.privateKey)
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signing),
  )

  return `${signing}.${b64urlEncode(new Uint8Array(sig))}`
}

function b64url(str: string): string {
  return b64urlEncode(new TextEncoder().encode(str))
}

function b64urlEncode(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded  = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
  const raw = atob(padded)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}
