import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { user, orgId: activeOrgId } = auth

    const body = await request.json()
    const { endpoint, keys, userAgent } = body as {
      endpoint: string
      keys: { p256dh: string; auth: string }
      userAgent?: string
    }

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 })
    }

    const service = createSupabaseServiceClient()

    // Upsert — один endpoint = одна запись (по UNIQUE constraint)
    const { error } = await service
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          org_id: activeOrgId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: userAgent || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )

    if (error) {
      console.error('[push/subscribe] DB error:', error)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { user } = auth

    const { endpoint } = await request.json()
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

    const service = createSupabaseServiceClient()
    await service
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe DELETE] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
