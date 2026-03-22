import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * GET /api/owner/worker-stats?period=today|week|month
 * Owner-only. Returns full sales analytics aggregated per worker.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId, orgRole } = auth

    if (orgRole !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const period = new URL(request.url).searchParams.get('period') ?? 'month'
    const now = new Date()
    let since: Date
    if (period === 'today') {
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'week') {
      since = new Date(now.getTime() - 7 * 86400000)
    } else {
      since = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    const sinceIso = since.toISOString()

    const supabase = createSupabaseServiceClient()

    // ── 1. Workers (role=user) ────────────────────────────────────────────────
    const { data: workers } = await supabase
      .from('org_users')
      .select('user_id, email, role')
      .eq('org_id', orgId)
      .eq('role', 'user')

    if (!workers || workers.length === 0) {
      return NextResponse.json({ hasWorkers: false })
    }

    // ── 2. Deals ──────────────────────────────────────────────────────────────
    const { data: deals } = await supabase
      .from('deals')
      .select(`
        id, title, amount, setup_fee, assigned_to,
        stage_id, stage_updated_at, created_at,
        stage:deal_stages(id, name, name_he, color, position, is_won, is_lost)
      `)
      .eq('org_id', orgId)
      .gte('created_at', sinceIso)

    const allDeals = (deals ?? []) as any[]

    // ── 3. KPI ────────────────────────────────────────────────────────────────
    const wonDeals = allDeals.filter(d => d.stage?.is_won)
    const totalRevenue    = wonDeals.reduce((s, d) => s + (Number(d.setup_fee) || 0), 0)
    const totalCommission = Math.round(totalRevenue * 0.3)
    const netProfit       = Math.round(totalRevenue - totalCommission)
    const conversionRate  = allDeals.length > 0
      ? Math.round((wonDeals.length / allDeals.length) * 100) : 0

    // ── 4. Funnel ─────────────────────────────────────────────────────────────
    const { data: stages } = await supabase
      .from('deal_stages')
      .select('id, name, name_he, color, position, is_won, is_lost')
      .eq('org_id', orgId)
      .order('position')

    const stageCount: Record<string, number> = {}
    allDeals.forEach(d => { if (d.stage_id) stageCount[d.stage_id] = (stageCount[d.stage_id] || 0) + 1 })

    const funnel = (stages ?? []).map((s: any) => ({
      id: s.id, name: s.name, name_he: s.name_he,
      color: s.color, position: s.position,
      is_won: s.is_won, is_lost: s.is_lost,
      count: stageCount[s.id] || 0,
    }))

    // ── 5. Per-worker stats ───────────────────────────────────────────────────
    const workerStats = workers.map((w: any) => {
      const wDeals  = allDeals.filter(d => d.assigned_to === w.user_id)
      const wWon    = wDeals.filter(d => d.stage?.is_won)
      const wActive = wDeals.filter(d => !d.stage?.is_won && !d.stage?.is_lost)
      const wRev    = wWon.reduce((s, d) => s + (Number(d.setup_fee) || 0), 0)
      return {
        user_id:       w.user_id,
        email:         w.email,
        active_deals:  wActive.length,
        won_deals:     wWon.length,
        total_revenue: Math.round(wRev),
        commission:    Math.round(wRev * 0.3),
        conversion:    wDeals.length > 0 ? Math.round((wWon.length / wDeals.length) * 100) : 0,
        total_deals:   wDeals.length,
      }
    })

    // ── 6. Bottlenecks — стадия не менялась > 3 дней ─────────────────────────
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
    const bottlenecks = allDeals
      .filter(d =>
        !d.stage?.is_won && !d.stage?.is_lost &&
        d.stage_updated_at && d.stage_updated_at < threeDaysAgo
      )
      .map(d => ({
        id:           d.id,
        title:        d.title,
        amount:       Number(d.amount) || 0,
        stage_name:   d.stage?.name ?? '',
        days_stuck:   Math.floor((Date.now() - new Date(d.stage_updated_at).getTime()) / 86400000),
        assigned_to:  d.assigned_to,
        worker_email: workers.find((w: any) => w.user_id === d.assigned_to)?.email ?? '',
      }))
      .sort((a: any, b: any) => b.days_stuck - a.days_stuck)
      .slice(0, 20)

    // ── 7. Activity log — audit_log таблица ───────────────────────────────────
    const { data: actLog } = await supabase
      .from('audit_log')
      .select('id, action, entity_type, entity_id, user_email, old_data, new_data, created_at')
      .eq('org_id', orgId)
      .eq('entity_type', 'deal')
      .order('created_at', { ascending: false })
      .limit(40)

    return NextResponse.json({
      hasWorkers: true,
      period,
      kpi: { totalRevenue, totalCommission, netProfit, conversionRate,
             totalDeals: allDeals.length, wonDeals: wonDeals.length },
      funnel,
      workerStats,
      bottlenecks,
      activityLog: actLog ?? [],
    })
  } catch (err) {
    console.error('[GET /api/owner/worker-stats]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
