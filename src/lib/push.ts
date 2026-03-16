/**
 * push.ts — Web Push utility (server-side only)
 * Uses the Web Push Protocol with VAPID authentication.
 * No external dependencies — pure Node.js crypto + fetch.
 */

import crypto from 'crypto'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@ambersol.co.il'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  tag?: string
  url?: string
  data?: Record<string, unknown>
  requireInteraction?: boolean
  silent?: boolean
  actions?: Array<{ action: string; title: string }>
}

// ─── Base64url helpers ───────────────────────────────────────────────────────

function base64urlDecode(str: string): Buffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (padded.length % 4)) % 4
  return Buffer.from(padded + '='.repeat(padding), 'base64')
}

function base64urlEncode(buf: Buffer): string {
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// ─── VAPID JWT ───────────────────────────────────────────────────────────────

async function createVapidJwt(audience: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' }
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600, // 12h
    sub: VAPID_SUBJECT,
  }

  const headerB64 = base64urlEncode(Buffer.from(JSON.stringify(header)))
  const payloadB64 = base64urlEncode(Buffer.from(JSON.stringify(payload)))
  const signingInput = `${headerB64}.${payloadB64}`

  // Import VAPID private key (raw base64url → JWK)
  const privateKeyBytes = base64urlDecode(VAPID_PRIVATE_KEY)
  const publicKeyBytes = base64urlDecode(VAPID_PUBLIC_KEY)

  // Public key is uncompressed: 0x04 + 32 bytes x + 32 bytes y
  const x = publicKeyBytes.slice(1, 33)
  const y = publicKeyBytes.slice(33, 65)

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: base64urlEncode(privateKeyBytes),
    x: base64urlEncode(x),
    y: base64urlEncode(y),
  }

  const key = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    Buffer.from(signingInput)
  )

  const sigB64 = base64urlEncode(Buffer.from(signature))
  return `${signingInput}.${sigB64}`
}

// ─── Send push notification ──────────────────────────────────────────────────

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const url = new URL(subscription.endpoint)
    const audience = `${url.protocol}//${url.host}`

    const jwt = await createVapidJwt(audience)
    const vapidAuth = `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`

    const body = JSON.stringify(payload)

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': vapidAuth,
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return { success: false, status: response.status, error: text }
    }

    return { success: true, status: response.status }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
