import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/worker/dashboard
// Returns everything the Focus Dashboard needs in one request:
//   1. burning_tasks  — overdue + due today (assigned to current user)
//   2. kpi            — this month's sales vs plan
//   3. funnel         — deal count per stage
//   4. activity_feed  — last 10 notifications for this user
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    const { user, orgId } = auth
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createSupabaseServiceClient()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    // Run all queries in parallel
    const [
      tasksRes,
      salesRes,
      planRes,
      funnelRes,
      activityRes,
      permRes,
      clientsCountRes,
    ] = await Promise.all([

      // 1. Burning tasks: overdue OR due today, assigned to user, not completed
      supabase
        .from('tasks')
        .select('id, title, due_date, priority, status, client_id')
        .eq('org_id', orgId)
        .eq('assigned_to', user.id)
        .in('status', ['open', 'in_progress'])
        .is('archived_at', null)
        .lt('due_date', todayEnd)
        .order('due_date', { ascending: true })
        .limit(20),

      // 2. KPI: sum of this user's closed sales this month
      supabase
        .from('sales')
        .select('total_amount')
        .eq('org_id', orgId)
        .eq('staff_id', user.id)
        .eq('status', 'paid')
        .gte('sale_date', monthStart.split('T')[0])
        .lt('sale_date',  monthEnd.split('T')[0]),

      // 3. KPI plan for this user this month
      supabase
        .from('sales_plans')
        .select('target_amount, target_deals, currency')
        .eq('org_id', orgId)
        .eq('period_year',  now.getFullYear())
        .eq('period_month', now.getMonth() + 1)
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('user_id', { ascending: false }) // personal plan takes priority over team plan
        .limit(1)
        .maybeSingle(),

      // 4. Funnel: this user's deals per stage (active only — post-filtered by is_won/is_lost)
      supabase
        .from('deals')
        .select('stage_id, stage:deal_stages(name, color, is_won, is_lost, position)')
        .eq('org_id', orgId)
        .eq('assigned_to', user.id),

      // 5. Activity feed: last 10 unread notifications for this user
      supabase
        .from('notifications')
        .select('id, type, title, body, link, is_read, created_at, priority')
        .eq('org_id', orgId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),

      // 6. Staff permissions (for phone masking flag)
      supabase
        .from('staff_permissions')
        .select('phone_mask_enabled, can_view_reports')
        .eq('org_id', orgId)
        .eq('user_id', user.id)
        .maybeSingle(),

      // 7. Count of clients assigned to this worker
      supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('assigned_to', user.id),
    ])

    // ── Process KPI ──────────────────────────────────────────
    const totalSalesAmount = (salesRes.data ?? []).reduce(
      (sum, s) => sum + Number(s.total_amount ?? 0), 0
    )
    const plan = planRes.data
    const kpiPercent = plan?.target_amount
      ? Math.min(Math.round((totalSalesAmount / plan.target_amount) * 100), 999)
      : null

    // ── Process Funnel ────────────────────────────────────────
    // Group deal counts by stage
    const stageCounts: Record<string, { name: string; color: string; count: number; position: number }> = {}
    for (const deal of funnelRes.data ?? []) {
      const s = deal.stage as { name: string; color: string; is_won: boolean; is_lost: boolean; position: number } | null
      if (!s || s.is_won || s.is_lost) continue
      const key = deal.stage_id
      if (!stageCounts[key]) {
        stageCounts[key] = { name: s.name, color: s.color, count: 0, position: s.position }
      }
      stageCounts[key].count++
    }
    const funnel = Object.values(stageCounts).sort((a, b) => a.position - b.position)

    // Active deals = sum of all non-won/non-lost stage counts (funnel is already filtered by assigned_to)
    const myActiveDeals = funnel.reduce((sum, s) => sum + s.count, 0)

    // ── Classify tasks ────────────────────────────────────────
    const tasks = (tasksRes.data ?? []).map(t => ({
      ...t,
      urgency: t.due_date < todayStart ? 'overdue' : 'today',
    }))

    return NextResponse.json({
      burning_tasks: tasks,
      kpi: {
        amount:         totalSalesAmount,
        target_amount:  plan?.target_amount ?? null,
        target_deals:   plan?.target_deals  ?? null,
        currency:       plan?.currency ?? 'ILS',
        percent:        kpiPercent,
        period:         { year: now.getFullYear(), month: now.getMonth() + 1 },
      },
      funnel,
      my_clients_count: clientsCountRes.count ?? 0,
      my_active_deals:  myActiveDeals,
      activity_feed:    activityRes.data ?? [],
      settings: {
        phone_mask_enabled: permRes.data?.phone_mask_enabled ?? false,
        can_view_reports:   permRes.data?.can_view_reports   ?? false,
      },
    })
  } catch (err) {
    console.error('[GET /api/worker/dashboard] unexpected', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
