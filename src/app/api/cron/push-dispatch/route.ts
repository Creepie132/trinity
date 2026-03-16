import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushNotification } from '@/lib/push'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/cron/push-dispatch
 * Called by Supabase pg_cron every minute.
 * Finds pending notifications → looks up push subscriptions → sends push → marks sent.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()
  const stats = { dispatched: 0, failed: 0, skipped: 0 }

  try {
    // 1. Find pending notifications (not sent, scheduled_at <= now or null)
    const { data: pending, error } = await supabase
      .from('notifications')
      .select('id, org_id, user_id, type, title, body, link, reference_id')
      .eq('push_sent', false)
      .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
      .order('created_at', { ascending: true })
      .limit(100) // process max 100 per minute

    if (error) throw error
    if (!pending?.length) {
      return NextResponse.json({ ok: true, stats })
    }

    // 2. Group by user_id to batch subscription lookups
    const userIdSet: Record<string, true> = {}
    pending.forEach(n => { if (n.user_id) userIdSet[n.user_id] = true })
    const userIds = Object.keys(userIdSet)

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', userIds)

    // Map: user_id → subscriptions[]
    const subsByUser = new Map<string, typeof subscriptions>()
    for (const sub of subscriptions ?? []) {
      if (!subsByUser.has(sub.user_id)) subsByUser.set(sub.user_id, [])
      subsByUser.get(sub.user_id)!.push(sub)
    }

    // 3. For each notification, check push_settings then send
    const notificationIds: string[] = []
    const expiredEndpoints: string[] = []

    for (const notif of pending) {
      const subs = subsByUser.get(notif.user_id) ?? []

      if (!subs.length) {
        // No subscriptions for this user — mark as sent (avoid re-processing)
        notificationIds.push(notif.id)
        stats.skipped++
        continue
      }

      // Check org push_settings
      const { data: org } = await supabase
        .from('organizations')
        .select('metadata')
        .eq('id', notif.org_id)
        .single()

      const pushSettings = org?.metadata?.push_settings ?? {}
      const eventKey = NOTIFICATION_TYPE_TO_SETTING[notif.type]

      // Если тип есть в маппинге и явно выключен — пропускаем
      // Если типа нет в маппинге — отправляем всегда (неизвестные типы не блокируем)
      if (eventKey && pushSettings[eventKey] === false) {
        notificationIds.push(notif.id)
        stats.skipped++
        continue
      }

      // Send to all user's subscriptions (multi-device)
      const results = await Promise.allSettled(
        subs.map(sub =>
          sendPushNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            {
              title: notif.title,
              body: notif.body ?? '',
              url: notif.link ?? '/dashboard',
              tag: notif.type,
              data: { reference_id: notif.reference_id },
            }
          )
        )
      )

      // Collect expired (410) endpoints
      results.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value.status === 410) {
          expiredEndpoints.push(subs[i].endpoint)
        }
      })

      const anySuccess = results.some(
        r => r.status === 'fulfilled' && r.value.success
      )

      notificationIds.push(notif.id)
      if (anySuccess) stats.dispatched++
      else stats.failed++
    }

    // 4. Mark all processed as sent
    if (notificationIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ push_sent: true, push_sent_at: now })
        .in('id', notificationIds)
    }

    // 5. Cleanup expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints)
    }

    return NextResponse.json({ ok: true, stats })
  } catch (err) {
    console.error('[push-dispatch] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Map notification type → push_settings key
// Types NOT in this map are always sent (no per-event toggle)
const NOTIFICATION_TYPE_TO_SETTING: Record<string, string> = {
  new_booking:            'new_visit',
  new_visit:              'new_visit',
  client_registered:      'new_client',
  visit_reminder_4h:      'visit_reminder',
  visit_reminder_1h:      'visit_reminder',
  visit_reminder_30m:     'visit_reminder',
  visit_overdue_10m:      'visit_reminder',
  visit_overdue_1h:       'visit_reminder',
  new_payment:            'new_payment',
  client_birthday:        'birthday',
  task_assigned:          'task_mentions',
  task_mention:           'task_mentions',
  task_completed:         'task_mentions',
  task_reminder:          'task_mentions',
  task_overdue_1h:        'task_mentions',
  task_overdue:           'task_mentions',
  stock_low:              'stock_alerts',
  stock_out:              'stock_alerts',
  admin_message:          'admin_messages',
  demo_order_submitted:   'admin_messages',
}
