import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/billing/status
 *
 * Polling fallback для SubscriptionLock.
 * Возвращает { active: boolean } — текущий статус подписки.
 * Вызывается каждые 15 сек пока пользователь на paywall-экране,
 * на случай если Supabase Realtime не доставил событие UPDATE.
 * Требует auth, НЕ требует активной подписки.
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ active: false }, { status: 401 })
    }

    let orgId = user.app_metadata?.org_id as string | undefined
    if (!orgId) {
      const { data: orgUser } = await supabaseAdmin
        .from('org_users').select('org_id').eq('user_id', user.id).single()
      orgId = orgUser?.org_id
    }
    if (!orgId) return NextResponse.json({ active: false })

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('subscription_status, subscription_expires_at')
      .eq('id', orgId)
      .single()

    if (!org) return NextResponse.json({ active: false })

    const now = new Date()
    const expiry = org.subscription_expires_at ? new Date(org.subscription_expires_at) : null
    const active =
      org.subscription_status === 'active' ||
      org.subscription_status === 'manual' ||
      org.subscription_status === 'demo' ||
      (org.subscription_status === 'trial' && expiry != null && expiry > now)

    return NextResponse.json({ active })
  } catch (err) {
    console.error('[billing/status] error:', err)
    return NextResponse.json({ active: false }, { status: 500 })
  }
}
