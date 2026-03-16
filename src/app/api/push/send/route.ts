import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { sendPushNotification, type PushPayload } from '@/lib/push'

/**
 * POST /api/push/send
 * Sends push notifications to all subscriptions for a given org (or specific user).
 * Protected — only admin can send org-wide notifications.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId: activeOrgId } = auth

    const body = await request.json() as {
      payload: PushPayload
      targetUserId?: string  // если нужно отправить конкретному юзеру
    }

    if (!body.payload?.title) {
      return NextResponse.json({ error: 'Missing payload.title' }, { status: 400 })
    }

    const service = createSupabaseServiceClient()

    // Получаем подписки: для конкретного юзера или всей org
    let query = service
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('org_id', activeOrgId)

    if (body.targetUserId) {
      query = query.eq('user_id', body.targetUserId)
    }

    const { data: subscriptions, error } = await query

    if (error) {
      console.error('[push/send] DB error:', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: 'No subscriptions' })
    }

    // Отправляем параллельно
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        sendPushNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body.payload
        )
      )
    )

    // Удаляем истёкшие подписки (410 Gone)
    const expiredEndpoints: string[] = []
    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value.status === 410) {
        expiredEndpoints.push(subscriptions[i].endpoint)
      }
    })

    if (expiredEndpoints.length > 0) {
      await service
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints)
    }

    const sent = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length

    return NextResponse.json({
      ok: true,
      sent,
      total: subscriptions.length,
      expired: expiredEndpoints.length,
    })
  } catch (err) {
    console.error('[push/send] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
