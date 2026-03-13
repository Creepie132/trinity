import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminRow } = await supabaseAdmin
      .from('admin_users').select('id').eq('user_id', user.id).maybeSingle()
    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Все организации
    const { data: orgs } = await supabaseAdmin
      .from('organizations')
      .select('id, name, subscription_status, billing_amount, subscription_expires_at, owner_email, created_at, last_seen_at, features')
      .not('name', 'ilike', '%test%')
      .order('billing_amount', { ascending: false, nullsFirst: false })

    const allOrgs = orgs || []
    const payingStatuses = ['active', 'trial', 'manual']
    const payingOrgs = allOrgs.filter(o =>
      payingStatuses.includes(o.subscription_status) && o.billing_amount != null
    )
    const freeOrgs = allOrgs.filter(o =>
      payingStatuses.includes(o.subscription_status) && o.billing_amount == null
    )
    const mrr = payingOrgs.reduce((sum, o) => sum + Number(o.billing_amount || 0), 0)
    const arr = mrr * 12
    const arpu = payingOrgs.length > 0 ? Math.round(mrr / payingOrgs.length) : 0

    // История платежей из billing_log
    const { data: billingLog } = await supabaseAdmin
      .from('subscription_billing_log')
      .select('org_id, amount, status, created_at')
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(20)

    // MRR по месяцам
    const monthlyRevenue: Record<string, number> = {}
    for (const entry of billingLog || []) {
      const month = entry.created_at.slice(0, 7)
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(entry.amount)
    }

    // 6 месяцев — реальные + текущий MRR если лог пустой
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const isCurrentMonth = i === 5
      return {
        month: key,
        revenue: monthlyRevenue[key] ?? (isCurrentMonth ? mrr : 0),
        projected: !monthlyRevenue[key],
      }
    })

    // Org breakdown
    const orgBreakdown = allOrgs.map(o => ({
      id: o.id,
      name: (o.features as any)?.business_info?.display_name || o.name,
      status: o.subscription_status,
      billing_amount: o.billing_amount,
      subscription_expires_at: o.subscription_expires_at,
      owner_email: o.owner_email,
      last_seen_at: o.last_seen_at,
      created_at: o.created_at,
    }))

    return NextResponse.json({
      mrr, arr, arpu,
      activeCount: payingOrgs.length,
      freeCount: freeOrgs.length,
      totalCount: allOrgs.length,
      months,
      recentPayments: billingLog || [],
      orgBreakdown,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
