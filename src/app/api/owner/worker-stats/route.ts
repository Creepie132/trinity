import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * GET /api/owner/worker-stats?period=today|week|month
 * Owner-only. Full sales analytics: KPI with delta, forecast, lead sources,
 * extended worker metrics, smart anomaly log.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId, orgRole, isAdmin } = auth

    if (orgRole !== 'owner' && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const period = new URL(request.url).searchParams.get('period') ?? 'month'
    const now = new Date()

    // Current period boundaries
    let since: Date
    let prevSince: Date
    let prevUntil: Date
    if (period === 'today') {
      since     = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      prevSince = new Date(since.getTime() - 86400000)
      prevUntil = since
    } else if (period === 'week') {
      since     = new Date(now.getTime() - 7 * 86400000)
      prevSince = new Date(now.getTime() - 14 * 86400000)
      prevUntil = since
    } else {
      since     = new Date(now.getFullYear(), now.getMonth(), 1)
      prevSince = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      prevUntil = since
    }
    const sinceIso    = since.toISOString()
    const prevSinceIso = prevSince.toISOString()
    const prevUntilIso = prevUntil.toISOString()

    const supabase = createSupabaseServiceClient()

    // ── 1. Workers (role=user) ────────────────────────────────────────────────
    const { data: workers } = await supabase
      .from('org_users')
      .select('user_id, email, role, last_seen_at')
      .eq('org_id', orgId)
      .neq('role', 'owner')

    // Fetch last_seen_at from admin_users for online presence
    const workerUserIds = (workers ?? []).map((w: any) => w.user_id)

    if (!workers || workers.length === 0) {
      return NextResponse.json({ hasWorkers: false })
    }
    const workerIds = workers.map((w: any) => w.user_id)

    // ── 2. All deals ──────────────────────────────────────────────────────────
    const { data: deals } = await supabase
      .from('deals')
      .select(`
        id, title, amount, setup_fee, source, assigned_to,
        stage_id, stage_updated_at, created_at,
        stage:deal_stages(id, name, name_he, color, position, is_won, is_lost)
      `)
      .eq('org_id', orgId)

    const allDeals = (deals ?? []) as any[]

    // ── 3. KPI current period ─────────────────────────────────────────────────
    const wonDeals        = allDeals.filter(d => d.stage?.is_won)
    const totalRevenue    = wonDeals.reduce((s: number, d: any) => s + (Number(d.setup_fee) || 0), 0)
    const totalCommission = Math.round(totalRevenue * 0.3)
    const netProfit       = Math.round(totalRevenue - totalCommission)
    const conversionRate  = allDeals.length > 0
      ? Math.round((wonDeals.length / allDeals.length) * 100) : 0

    // ── 4. KPI previous period (for delta) ───────────────────────────────────
    const { data: prevDealsRaw } = await supabase
      .from('deals')
      .select('setup_fee, stage_id, stage:deal_stages(is_won)')
      .eq('org_id', orgId)
      .gte('stage_updated_at', prevSinceIso)
      .lt('stage_updated_at', prevUntilIso)

    const prevDeals        = (prevDealsRaw ?? []) as any[]
    const prevWon          = prevDeals.filter((d: any) => d.stage?.is_won)
    const prevRevenue      = prevWon.reduce((s: number, d: any) => s + (Number(d.setup_fee) || 0), 0)
    const prevNetProfit    = Math.round(prevRevenue * 0.7)
    const prevCommission   = Math.round(prevRevenue * 0.3)

    const delta = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0
      return Math.round(((curr - prev) / prev) * 100)
    }

    // ── 5. Funnel ─────────────────────────────────────────────────────────────
    const { data: stages } = await supabase
      .from('deal_stages')
      .select('id, name, name_he, color, position, is_won, is_lost')
      .eq('org_id', orgId)
      .order('position')

    const stageCount: Record<string, number> = {}
    allDeals.forEach((d: any) => {
      if (d.stage_id) stageCount[d.stage_id] = (stageCount[d.stage_id] || 0) + 1
    })

    const funnel = (stages ?? []).map((s: any) => ({
      id: s.id, name: s.name, name_he: s.name_he,
      color: s.color, position: s.position,
      is_won: s.is_won, is_lost: s.is_lost,
      count: stageCount[s.id] || 0,
    }))

    // ── 6. Forecast ───────────────────────────────────────────────────────────
    // Deals in non-won, non-lost stages = «в переговорах»
    const avgConversion = conversionRate / 100
    const pipelineDeals = allDeals.filter((d: any) => !d.stage?.is_won && !d.stage?.is_lost)
    const pipelineValue = pipelineDeals.reduce((s: number, d: any) => s + (Number(d.setup_fee) || Number(d.amount) || 0), 0)
    const forecastRevenue = Math.round(totalRevenue + pipelineValue * avgConversion)

    // ── 7. Lead sources distribution ──────────────────────────────────────────
    const sourceMap: Record<string, number> = {}
    allDeals.forEach((d: any) => {
      const src = d.source || 'direct'
      sourceMap[src] = (sourceMap[src] || 0) + 1
    })
    const leadSources = Object.entries(sourceMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    // ── 8. Activity Pulse — WA outgoing msgs today ────────────────────────────
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const { data: waMsgsToday } = await supabase
      .from('wa_messages')
      .select('sent_by_user_id')
      .eq('org_id', orgId)
      .eq('direction', 'out')
      .gte('created_at', todayStart)
      .in('sent_by_user_id', workerIds)

    const waPulseMap: Record<string, number> = {}
    ;(waMsgsToday ?? []).forEach((m: any) => {
      if (m.sent_by_user_id) waPulseMap[m.sent_by_user_id] = (waPulseMap[m.sent_by_user_id] || 0) + 1
    })

    // ── 9. First-response time — audit_log: deal created → first comm_log ─────
    // For each worker: avg minutes from deal created_at to first communication_log entry
    const { data: commLogs } = await supabase
      .from('communication_log')
      .select('user_id, deal_id, happened_at')
      .eq('org_id', orgId)
      .eq('direction', 'out')
      .in('user_id', workerIds)
      .not('deal_id', 'is', null)

    // Build map deal_id → first touch time per user
    const firstTouchMap: Record<string, { userId: string; at: Date }> = {}
    ;(commLogs ?? []).forEach((c: any) => {
      const key = c.deal_id
      const t = new Date(c.happened_at)
      if (!firstTouchMap[key] || t < firstTouchMap[key].at) {
        firstTouchMap[key] = { userId: c.user_id, at: t }
      }
    })

    // Per worker: avg response minutes
    const responseTimesMap: Record<string, number[]> = {}
    Object.values(firstTouchMap).forEach(({ userId, at }) => {
      // Find the deal
      const deal = allDeals.find((d: any) => d.id in firstTouchMap && firstTouchMap[d.id]?.userId === userId)
      if (deal) {
        const mins = Math.round((at.getTime() - new Date(deal.created_at).getTime()) / 60000)
        if (mins >= 0 && mins < 10080) { // cap at 1 week
          if (!responseTimesMap[userId]) responseTimesMap[userId] = []
          responseTimesMap[userId].push(mins)
        }
      }
    })

    // ── 10. Per-worker stats (extended) ───────────────────────────────────────
    // last_seen_at is now directly on org_users row

    const workerStats = workers.map((w: any) => {
      const wDeals  = allDeals.filter((d: any) => d.assigned_to === w.user_id)
      const wWon    = wDeals.filter((d: any) => d.stage?.is_won)
      const wActive = wDeals.filter((d: any) => !d.stage?.is_won && !d.stage?.is_lost)
      const wRev    = wWon.reduce((s: number, d: any) => s + (Number(d.setup_fee) || 0), 0)
      const times   = responseTimesMap[w.user_id] ?? []
      const avgResp = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null
      const valuePL = wWon.length > 0 ? Math.round(wRev / wWon.length) : 0

      return {
        user_id:           w.user_id,
        email:             w.email,
        active_deals:      wActive.length,
        won_deals:         wWon.length,
        total_revenue:     Math.round(wRev),
        commission:        Math.round(wRev * 0.3),
        conversion:        wDeals.length > 0 ? Math.round((wWon.length / wDeals.length) * 100) : 0,
        total_deals:       wDeals.length,
        // Extended metrics
        wa_pulse:          waPulseMap[w.user_id] || 0,
        avg_response_min:  avgResp,
        value_per_lead:    valuePL,
        // Online presence — directly from org_users
        last_seen_at:      w.last_seen_at ?? null,
      }
    })

    // ── 11. Bottlenecks ───────────────────────────────────────────────────────
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
    const bottlenecks = allDeals
      .filter((d: any) =>
        !d.stage?.is_won && !d.stage?.is_lost &&
        d.stage_updated_at && d.stage_updated_at < threeDaysAgo
      )
      .map((d: any) => ({
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

    // ── 12. Smart audit log with anomaly detection ─────────────────────────────
    const { data: actLogRaw } = await supabase
      .from('audit_log')
      .select('id, action, entity_type, entity_id, user_email, old_data, new_data, ip_address, created_at')
      .eq('org_id', orgId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(60)

    // Won deal stage IDs set
    const wonStageIds = new Set((stages ?? []).filter((s: any) => s.is_won).map((s: any) => s.id))

    const activityLog = (actLogRaw ?? []).map((e: any) => {
      let anomaly: string | null = null

      // Anomaly 1: setup_fee changed AFTER deal was already won
      if (
        e.entity_type === 'deal' &&
        e.new_data?.setup_fee !== undefined &&
        e.old_data?.setup_fee !== undefined &&
        e.new_data?.setup_fee !== e.old_data?.setup_fee
      ) {
        // Check if deal stage at time of change was a won stage
        const dealAtChange = allDeals.find((d: any) => d.id === e.entity_id)
        if (dealAtChange && wonStageIds.has(dealAtChange.stage_id)) {
          anomaly = 'fee_after_close'
        }
      }

      // Anomaly 2: deal/client deleted
      if (e.action === 'delete') {
        anomaly = 'deletion'
      }

      // Anomaly 3: unauthorized access attempt (ip_address logged but not owner)
      if (e.action === 'unauthorized_access') {
        anomaly = 'unauthorized_access'
      }

      return { ...e, anomaly }
    })

    return NextResponse.json({
      hasWorkers: true,
      period,
      kpi: {
        totalRevenue, totalCommission, netProfit, conversionRate,
        totalDeals: allDeals.length, wonDeals: wonDeals.length,
        // Delta vs previous period
        deltaRevenue:    delta(totalRevenue, prevRevenue),
        deltaCommission: delta(totalCommission, prevCommission),
        deltaNetProfit:  delta(netProfit, prevNetProfit),
      },
      forecast: {
        forecastRevenue,
        pipelineValue,
        pipelineDeals: pipelineDeals.length,
        avgConversionPct: conversionRate,
      },
      leadSources,
      funnel,
      workerStats,
      bottlenecks,
      activityLog,
    })
  } catch (err) {
    console.error('[GET /api/owner/worker-stats]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
