import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ hasAccess: false })
    }

    console.log('=== ACCESS CHECK ===')
    console.log('User ID:', user.id)
    console.log('Email:', user.email)

    // Check if admin
    const { data: admin } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (admin) {
      console.log('User is admin, has access')
      return NextResponse.json({ hasAccess: true, reason: 'admin' })
    }

    // Check org user + subscription
    const { data: orgUser } = await supabaseAdmin
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!orgUser) {
      console.log('User not in any organization')
      return NextResponse.json({ hasAccess: false, reason: 'no_org' })
    }

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('subscription_status, subscription_expires_at')
      .eq('id', orgUser.org_id)
      .single()

    const now = new Date()
    const expires = org?.subscription_expires_at ? new Date(org.subscription_expires_at) : null

    const hasAccess =
      org?.subscription_status === 'active' ||
      (org?.subscription_status === 'trial' && expires && expires > now) ||
      (org?.subscription_status === 'manual' && expires && expires > now)

    console.log('Subscription status:', org?.subscription_status)
    console.log('Expires at:', org?.subscription_expires_at)
    console.log('Has access:', hasAccess)

    return NextResponse.json({
      hasAccess,
      subscriptionStatus: org?.subscription_status,
      expiresAt: org?.subscription_expires_at,
      reason: hasAccess ? 'active_subscription' : 'no_active_subscription',
    })
  } catch (error: any) {
    console.error('=== ACCESS CHECK ERROR ===')
    console.error('Error:', error)
    return NextResponse.json(
      { hasAccess: false, error: error?.message },
      { status: 500 }
    )
  }
}
