import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSubscriptionPaymentUrl } from '@/lib/tranzila'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_PRICES: Record<string, number> = {
  basic: 199,
  pro: 249,
  enterprise: 499,
}

/**
 * POST /api/billing/paywall-link
 *
 * Генерирует Tranzila ссылку для оплаты подписки прямо с Paywall-экрана.
 * Доступен для залогиненного пользователя с ЛЮБЫМ subscription_status.
 * Не требует активной подписки — это точка восстановления доступа.
 */
export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Org из JWT → fallback на org_users
    let orgId = user.app_metadata?.org_id as string | undefined
    if (!orgId) {
      const { data: orgUser } = await supabaseAdmin
        .from('org_users')
        .select('org_id')
        .eq('user_id', user.id)
        .single()
      orgId = orgUser?.org_id
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No organization' }, { status: 403 })
    }

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id, name, plan, subscription_status')
      .eq('id', orgId)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const plan = body.plan || org.plan || 'basic'
    const amount = PLAN_PRICES[plan] ?? 199

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ambersol.co.il'

    const paymentUrl = createSubscriptionPaymentUrl({
      amount,
      recurSum: amount,
      orgId,
      orgName: org.name || 'Trinity CRM',
      plan,
      ownerEmail: user.email,
      notifyUrl: `${origin}/api/payments/tranzila/webhook`,
      successUrl: `${origin}/payment/success?from=paywall`,
      failUrl: `${origin}/payment/fail?from=paywall`,
    })

    return NextResponse.json({ url: paymentUrl, amount, plan })
  } catch (err) {
    console.error('[billing/paywall-link] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
