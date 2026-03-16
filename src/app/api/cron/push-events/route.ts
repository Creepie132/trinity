import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/cron/push-events
 * Called every 5 minutes. Scans for upcoming events and inserts
 * notification rows that push-dispatch will pick up.
 *
 * Uses a dedup key (type + reference_id) to avoid duplicate rows.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const stats = { visits: 0, tasks: 0, stock: 0 }

  // ── 1. VISIT TIMERS ────────────────────────────────────────────────────────
  // Windows: 4h before, 1h before, 30m before, 10m after end, 1h after end

  const visitWindows = [
    { key: 'visit_reminder_4h',  offsetMin: -240, windowMin: 5, titleHe: 'תזכורת לביקור', bodyFn: (t: string) => `עוד 4 שעות — ${t}` },
    { key: 'visit_reminder_1h',  offsetMin:  -60, windowMin: 5, titleHe: 'תזכורת לביקור', bodyFn: (t: string) => `עוד שעה — ${t}` },
    { key: 'visit_reminder_30m', offsetMin:  -30, windowMin: 5, titleHe: 'תזכורת לביקור', bodyFn: (t: string) => `עוד 30 דקות — ${t}` },
  ]

  for (const w of visitWindows) {
    const windowStart = new Date(now.getTime() + w.offsetMin * 60_000)
    const windowEnd   = new Date(windowStart.getTime() + w.windowMin * 60_000)

    const { data: visits } = await supabase
      .from('visits')
      .select(`
        id, scheduled_at, duration_minutes, service_type, org_id,
        services(name),
        org_users!inner(user_id)
      `)
      .gte('scheduled_at', windowStart.toISOString())
      .lt('scheduled_at', windowEnd.toISOString())
      .eq('status', 'scheduled')

    for (const v of visits ?? []) {
      const svcName = (v.services as any)?.name || v.service_type || 'ביקור'
      const time = new Date(v.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      const orgUsers = v.org_users as any[]

      for (const ou of orgUsers ?? []) {
        await insertNotificationOnce({
          org_id: v.org_id,
          user_id: ou.user_id,
          type: w.key,
          title: w.titleHe,
          body: w.bodyFn(`${svcName} ב-${time}`),
          link: '/diary',
          reference_id: v.id,
        })
      }
      stats.visits++
    }
  }

  // ── 2. OVERDUE VISIT (didn't click "Complete") ─────────────────────────────
  const overdueWindows = [
    { key: 'visit_overdue_10m', endOffsetMin: 10,  windowMin: 5, titleHe: 'ביקור לא הסתיים', bodyHe: 'לא סומן כ"הסתיים" — בדוק' },
    { key: 'visit_overdue_1h',  endOffsetMin: 60,  windowMin: 5, titleHe: 'ביקור לא הסתיים', bodyHe: 'שעה עברה — הביקור עדיין פתוח' },
  ]

  for (const w of overdueWindows) {
    const endTarget     = new Date(now.getTime() - w.endOffsetMin * 60_000)
    const endWindowEnd  = new Date(endTarget.getTime() + w.windowMin * 60_000)

    const { data: visits } = await supabase
      .from('visits')
      .select('id, scheduled_at, duration_minutes, org_id, org_users!inner(user_id)')
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date(endTarget.getTime() - 120 * 60_000).toISOString())
      .lt('scheduled_at', endWindowEnd.toISOString())

    for (const v of visits ?? []) {
      const dur = (v.duration_minutes ?? 60) * 60_000
      const expectedEnd = new Date(new Date(v.scheduled_at).getTime() + dur)
      const sinceEnd = now.getTime() - expectedEnd.getTime()
      const targetMs = w.endOffsetMin * 60_000

      if (sinceEnd < targetMs || sinceEnd > targetMs + w.windowMin * 60_000) continue

      const orgUsers = v.org_users as any[]
      for (const ou of orgUsers ?? []) {
        await insertNotificationOnce({
          org_id: v.org_id,
          user_id: ou.user_id,
          type: w.key,
          title: w.titleHe,
          body: w.bodyHe,
          link: '/diary',
          reference_id: v.id,
        })
      }
      stats.visits++
    }
  }

  // ── 3. TASK TIMERS ─────────────────────────────────────────────────────────

  // 3a. 1 hour before task becomes overdue
  const taskDueWarningEnd   = new Date(now.getTime() + 65 * 60_000)
  const taskDueWarningStart = new Date(now.getTime() + 55 * 60_000)

  const { data: tasksAboutDue } = await supabase
    .from('tasks')
    .select('id, title, org_id, assigned_to, created_by, due_date')
    .eq('status', 'open')
    .gte('due_date', taskDueWarningStart.toISOString())
    .lt('due_date', taskDueWarningEnd.toISOString())

  for (const t of tasksAboutDue ?? []) {
    const seen: Record<string, true> = {}
    const recipients = [t.assigned_to, t.created_by]
      .filter((id): id is string => !!id && !seen[id] && (seen[id] = true))
    for (const uid of recipients) {
      await insertNotificationOnce({
        org_id: t.org_id, user_id: uid,
        type: 'task_overdue_1h',
        title: '⏰ משימה מתקרבת לתפוגה',
        body: t.title,
        link: '/diary',
        reference_id: t.id,
      })
    }
    stats.tasks++
  }

  // 3b. Task is now overdue (just passed due_date within 5m window)
  const taskOverdueStart = new Date(now.getTime() - 5 * 60_000)

  const { data: tasksOverdue } = await supabase
    .from('tasks')
    .select('id, title, org_id, assigned_to, created_by, due_date')
    .eq('status', 'open')
    .gte('due_date', taskOverdueStart.toISOString())
    .lt('due_date', now.toISOString())

  for (const t of tasksOverdue ?? []) {
    const seenO: Record<string, true> = {}
    const recipients = [t.assigned_to, t.created_by]
      .filter((id): id is string => !!id && !seenO[id] && (seenO[id] = true))
    for (const uid of recipients) {
      await insertNotificationOnce({
        org_id: t.org_id, user_id: uid,
        type: 'task_overdue',
        title: '🚨 משימה פגה',
        body: t.title,
        link: '/diary',
        reference_id: t.id,
      })
    }
    stats.tasks++
  }

  // ── 4. STOCK ALERTS ────────────────────────────────────────────────────────
  const { data: products } = await supabase
    .from('products')
    .select('id, name, org_id, stock, low_stock_threshold, stock_status')
    .in('stock_status', ['low', 'out'])

  for (const p of products ?? []) {
    const notifType = p.stock_status === 'out' ? 'stock_out' : 'stock_low'
    const titleHe = p.stock_status === 'out' ? '📦 מוצר אזל' : '📦 מלאי נמוך'
    const bodyHe  = p.stock_status === 'out'
      ? `${p.name} — אזל מהמלאי`
      : `${p.name} — נשארו ${p.stock} יחידות`

    // Find owner of this org
    const { data: owners } = await supabase
      .from('org_users')
      .select('user_id')
      .eq('org_id', p.org_id)
      .eq('role', 'owner')

    for (const o of owners ?? []) {
      await insertNotificationOnce({
        org_id: p.org_id, user_id: o.user_id,
        type: notifType,
        title: titleHe,
        body: bodyHe,
        link: '/inventory',
        reference_id: p.id,
      })
    }
    stats.stock++
  }

  return NextResponse.json({ ok: true, stats })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface NotifInsert {
  org_id: string
  user_id: string
  type: string
  title: string
  body: string
  link: string
  reference_id: string
}

/**
 * Insert notification only if one with same (type + reference_id + user_id) 
 * doesn't already exist today. Prevents duplicates on every 5m tick.
 */
async function insertNotificationOnce(n: NotifInsert) {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('type', n.type)
    .eq('reference_id', n.reference_id)
    .eq('user_id', n.user_id)
    .gte('created_at', todayStart.toISOString())
    .maybeSingle()

  if (existing) return // already created today

  await supabase.from('notifications').insert({
    ...n,
    push_sent: false,
    is_read: false,
    priority: 'normal',
  })
}
