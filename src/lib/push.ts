/**
 * push.ts — Web Push utility (server-side only)
 * Uses the `web-push` library for correct VAPID + payload encryption (RFC 8291).
 */

import webpush from 'web-push'

const VAPID_PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT || 'mailto:admin@ambersol.co.il'

// Configure VAPID once at module load
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

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

// ─── Send push notification ──────────────────────────────────────────────────

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const result = await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth:   subscription.keys.auth,
        },
      },
      JSON.stringify(payload),
      {
        TTL: 86400,
        urgency: 'normal',
      }
    )

    return { success: true, status: result.statusCode }
  } catch (err: unknown) {
    const e = err as { statusCode?: number; body?: string; message?: string }
    // 410 Gone = subscription expired, caller should delete it
    return {
      success: false,
      status: e.statusCode,
      error: e.body ?? e.message ?? String(err),
    }
  }
}
