import { NextRequest, NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/worker/dashboard
// Active Workplace — всё что нужно продажнику в одном запросе:
//   1. burning_tasks   — просроченные + на сегодня
//   2. red_zone_deals  — сделки без касания > 120 мин в рабочее время
//   3. new_leads       — новые лиды за последние 24ч (assigned_to = me)
//   4. kpi             — план/факт текущего месяца
//   5. funnel          — воронка (компактная карта)
//   6. activity_feed   — последние 8 уведомлений

// Рабочие часы: 09:00–19:00 (Israel time = UTC+3)
const WORK_START_H = 9
const WORK_END_H   = 19
const RED_ZONE_MINUTES = 120

function isWorkingHours(now: Date): boolean {
  const ilHour = (now.getUTCHours() + 3) % 24
  return ilHour >= WORK_START_H && ilHour < WORK_END_H
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth
    // Продажник работает без org — данные фильтруются по user.id (assigned_to)
    const orgId = 'worker_no_org' // заглушка, не используется в запросах ниже

    const supabase = createSupabaseServiceClient()
    const now        = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    const last24h    = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const redZoneCutoff = new Date(now.getTime() - RED_ZONE_MINUTES * 60 * 1000).toISOString()

    const [
      tasksRes,
      redZoneRes,
      newLeadsRes,
      salesRes,
      planRes,
      funnelRes,
      activityRes,
      permRes,
      clientsCountRes,
      todayMeetingsRes,
      todayTasksRes,
    ] = await Promise.all([

      // 1. Burning tasks: просроченные + на сегодня
      supabase
        .from('tasks')
        .select('id, title, due_date, priority, status, client_id')
        .eq('assigned_to', user.id)
        .in('status', ['open', 'in_progress'])
        .is('archived_at', null)
        .lt('due_date', todayEnd)
        .order('due_date', { ascending: true })
        .limit(15),

      // 2. Красная зона: активные сделки без касания > 120 мин
      // Используем индекс idx_deals_assigned_last_contact
      supabase
        .from('deals')
        .select(`
          id, title, amount, currency, last_contact_at, next_action, stage_id,
          client:clients(id, first_name, last_name, phone)
        `)
        .eq('assigned_to', user.id)
        .not('stage_id', 'is', null)
        .or(`last_contact_at.lt.${redZoneCutoff},last_contact_at.is.null`)
        .order('last_contact_at', { ascending: true, nullsFirst: true })
        .limit(10),

      // 3. Новые лиды за 24ч
      supabase
        .from('deals')
        .select(`
          id, title, amount, currency, source, created_at,
          client:clients(id, first_name, last_name, phone)
        `)
        .eq('assigned_to', user.id)
        .gte('created_at', last24h)
        .order('created_at', { ascending: false })
        .limit(10),

      // 4. KPI: продажи за месяц
      supabase
        .from('sales')
        .select('total_amount')
        .eq('staff_id', user.id)
        .eq('status', 'paid')
        .gte('sale_date', monthStart.split('T')[0])
        .lt('sale_date',  monthEnd.split('T')[0]),

      // 5. План на месяц
      supabase
        .from('sales_plans')
        .select('target_amount, target_deals, currency')
        .eq('period_year',  now.getFullYear())
        .eq('period_month', now.getMonth() + 1)
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('user_id', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // 6. Воронка (компактная карта)
      supabase
        .from('deals')
        .select('stage_id, stage:deal_stages(name, color, is_won, is_lost, position)')
        .eq('assigned_to', user.id),

      // 7. Activity feed
      supabase
        .from('notifications')
        .select('id, type, title, body, link, is_read, created_at, priority')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8),

      // 8. Права
      supabase
        .from('staff_permissions')
        .select('phone_mask_enabled, can_view_reports')
        .eq('user_id', user.id)
        .maybeSingle(),

      // 9. Мои клиенты
      supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id),

      // 10. Встречи на сегодня
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('task_type', 'meeting')
        .in('status', ['open', 'in_progress'])
        .is('archived_at', null)
        .gte('due_date', todayStart)
        .lt('due_date',  todayEnd),

      // 11. Задачи на сегодня
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .neq('task_type', 'meeting')
        .in('status', ['open', 'in_progress'])
        .is('archived_at', null)
        .gte('due_date', todayStart)
        .lt('due_date',  todayEnd),
    ])

    // ── KPI ────────────────────────────────────────────────────
    const totalSalesAmount = (salesRes.data ?? []).reduce(
      (sum, s) => sum + Number(s.total_amount ?? 0), 0
    )
    const plan = planRes.data
    const kpiPercent = plan?.target_amount
      ? Math.min(Math.round((totalSalesAmount / plan.target_amount) * 100), 999)
      : null

    // ── Воронка ────────────────────────────────────────────────
    type StageShape = { name: string; color: string; is_won: boolean; is_lost: boolean; position: number }
    const stageCounts: Record<string, { name: string; color: string; count: number; position: number }> = {}
    for (const deal of funnelRes.data ?? []) {
      const raw = deal.stage
      const s: StageShape | null = Array.isArray(raw)
        ? (raw[0] as StageShape ?? null)
        : (raw as unknown as StageShape | null)
      if (!s || s.is_won || s.is_lost) continue
      const key = deal.stage_id
      if (!stageCounts[key]) {
        stageCounts[key] = { name: s.name, color: s.color, count: 0, position: s.position }
      }
      stageCounts[key].count++
    }
    const funnel = Object.values(stageCounts).sort((a, b) => a.position - b.position)
    const myActiveDeals = funnel.reduce((sum, s) => sum + s.count, 0)

    // ── Задачи ─────────────────────────────────────────────────
    const tasks = (tasksRes.data ?? []).map(t => ({
      ...t,
      urgency: t.due_date < todayStart ? 'overdue' : 'today',
    }))

    // ── Красная зона — только в рабочее время ─────────────────
    const redZoneDeals = isWorkingHours(now)
      ? (redZoneRes.data ?? []).map(d => ({
          ...d,
          minutes_silent: d.last_contact_at
            ? Math.floor((now.getTime() - new Date(d.last_contact_at).getTime()) / 60000)
            : null,
        }))
      : []

    return NextResponse.json({
      burning_tasks:    tasks,
      red_zone_deals:   redZoneDeals,
      new_leads:        newLeadsRes.data ?? [],
      kpi: {
        amount:        totalSalesAmount,
        target_amount: plan?.target_amount ?? null,
        target_deals:  plan?.target_deals  ?? null,
        currency:      plan?.currency ?? 'ILS',
        percent:       kpiPercent,
        period:        { year: now.getFullYear(), month: now.getMonth() + 1 },
      },
      funnel,
      my_clients_count: clientsCountRes.count ?? 0,
      my_active_deals:  myActiveDeals,
      today_meetings:   todayMeetingsRes.count ?? 0,
      today_tasks:      todayTasksRes.count ?? 0,
      activity_feed:    activityRes.data ?? [],
      is_working_hours: isWorkingHours(now),
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
