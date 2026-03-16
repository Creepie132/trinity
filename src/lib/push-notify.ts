/**
 * push-notify.ts — Server-side helper to queue a push notification.
 * Writes to the `notifications` table; push-dispatch cron picks it up.
 *
 * Usage:
 *   await queuePushNotification({ org_id, user_id, type, title, body, link, reference_id })
 *
 * This is fire-and-forget — never throws, never blocks the caller.
 */

import { createSupabaseServiceClient } from '@/lib/supabase-service'

interface PushNotifParams {
  org_id: string
  user_id: string          // recipient
  type: string             // matches NOTIFICATION_TYPE_TO_SETTING map
  title: string
  body: string
  link?: string
  reference_id?: string
  scheduled_at?: string    // ISO — for future scheduled notifications
}

export async function queuePushNotification(params: PushNotifParams): Promise<void> {
  try {
    const service = createSupabaseServiceClient()
    await service.from('notifications').insert({
      org_id: params.org_id,
      user_id: params.user_id,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link ?? '/dashboard',
      reference_id: params.reference_id ?? null,
      scheduled_at: params.scheduled_at ?? null,
      push_sent: false,
      is_read: false,
      priority: 'normal',
    })
  } catch (err) {
    // Non-fatal — log and continue
    console.error('[queuePushNotification] failed:', err)
  }
}

/**
 * Queue push to ALL owners of an org.
 * Useful for events triggered by non-authenticated sources (public booking, cron).
 */
export async function queuePushToOrgOwners(
  params: Omit<PushNotifParams, 'user_id'>
): Promise<void> {
  try {
    const service = createSupabaseServiceClient()
    const { data: owners } = await service
      .from('org_users')
      .select('user_id')
      .eq('org_id', params.org_id)
      .eq('role', 'owner')

    if (!owners?.length) return

    await Promise.all(
      owners.map(o => queuePushNotification({ ...params, user_id: o.user_id }))
    )
  } catch (err) {
    console.error('[queuePushToOrgOwners] failed:', err)
  }
}
