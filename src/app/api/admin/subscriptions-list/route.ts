import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminRow } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Load organizations (service role bypasses RLS)
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from('organizations')
      .select(`
        id,
        name,
        plan,
        features,
        subscription_status,
        subscription_expires_at,
        billing_amount,
        billing_due_date,
        billing_status,
        tranzila_card_token,
        tranzila_card_last4,
        tranzila_card_expiry,
        payments_enabled,
        recurring_enabled,
        branches_enabled,
        last_seen_at,
        created_at,
        tranzila_token_terminal,
        tranzila_token_password,
        org_users (
          role,
          user_id,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (orgsError) {
      console.error('[subscriptions-list] orgs error:', orgsError)
      // Try without new columns in case migration wasn't run
      const { data: orgsFallback, error: fallbackError } = await supabaseAdmin
        .from('organizations')
        .select(`
          id,
          name,
          plan,
          features,
          subscription_status,
          subscription_expires_at,
          org_users (
            role,
            user_id,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 })
      }

      const formatted = (orgsFallback || []).map((org: any) => {
        const businessInfo = org.features?.business_info || {}
        const owner = org.org_users?.find((u: any) => u.role === 'owner')
        return {
          id: org.id,
          name: org.name,
          plan: org.plan || 'demo',
          display_name: businessInfo.display_name || org.name,
          subscription_status: org.subscription_status || 'none',
          subscription_expires_at: org.subscription_expires_at,
          owner_name: businessInfo.owner_name || '—',
          owner_email: owner?.email || businessInfo.email || '—',
          phone: businessInfo.mobile || '—',
          features: org.features,
          billing_amount: null,
          billing_due_date: null,
          billing_status: null,
          tranzila_card_token: null,
          tranzila_card_last4: null,
          payments_enabled: true,
          recurring_enabled: false,
        }
      })

      return NextResponse.json({ organizations: formatted })
    }

    const formatted = (orgs || []).map((org: any) => {
      const businessInfo = org.features?.business_info || {}
      const owner = org.org_users?.find((u: any) => u.role === 'owner')
      return {
        id: org.id,
        name: org.name,
        plan: org.plan || 'demo',
        display_name: businessInfo.display_name || org.name,
        subscription_status: org.subscription_status || 'none',
        subscription_expires_at: org.subscription_expires_at,
        owner_name: businessInfo.owner_name || '—',
        owner_email: owner?.email || businessInfo.email || '—',
        phone: businessInfo.mobile || '—',
        features: org.features,
        billing_amount: org.billing_amount ?? null,
        billing_due_date: org.billing_due_date ?? null,
        billing_status: org.billing_status ?? null,
        tranzila_card_token: org.tranzila_card_token ?? null,
        tranzila_card_last4: org.tranzila_card_last4 ?? null,
        tranzila_card_expiry: org.tranzila_card_expiry ?? null,
        payments_enabled: org.payments_enabled ?? true,
        recurring_enabled: org.recurring_enabled ?? false,
        branches_enabled: org.branches_enabled ?? false,
        last_seen_at: org.last_seen_at ?? null,
        created_at: org.created_at ?? null,
        tranzila_token_terminal: org.tranzila_token_terminal ?? null,
        tranzila_token_password: org.tranzila_token_password ?? null,
      }
    })

    // Load access requests
    const { data: accessRequests } = await supabaseAdmin
      .from('access_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })

    return NextResponse.json({
      organizations: formatted,
      accessRequests: accessRequests || [],
    })
  } catch (err: any) {
    console.error('[subscriptions-list] unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
