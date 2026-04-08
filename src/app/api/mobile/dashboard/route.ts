/**
 * GET /api/mobile/dashboard
 * Мобильный дашборд — единый endpoint для Flutter приложения.
 * Auth: Bearer токен из Authorization header.
 *
 * Блоки ответа:
 *   today         — визиты/выручка/ближайшие визиты за сегодня
 *   stats         — общие статы орга (клиенты, месяц, долги)
 *   top_services  — топ-3 услуги за текущий месяц по выручке
 *   new_clients   — последние 5 новых клиентов
 *   debtors       — клиенты с незакрытыми долгами
 *   birthdays     — клиенты с ДР на этой неделе
 *   whatsapp      — непрочитанные разговоры wa_conversations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const service = createSupabaseServiceClient()
    const now = new Date()

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const weekEnd    = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7)

    const [
      visitsToday,
      revenueToday,
      clientsTotal,
      visitsMonth,
      revenueMonth,
      debts,
      upcomingVisits,
      topServicesRaw,
      newClientsRaw,
      debtorsRaw,
      allClientsWithBd,
      waConversations,
    ] = await Promise.all([
      service.from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('scheduled_at', todayStart.toISOString())
        .lte('scheduled_at', todayEnd.toISOString())
        .in('status', ['scheduled', 'in_progress', 'completed']),

      service.from('payments')
        .select('amount')
        .eq('org_id', orgId)
        .eq('status', 'completed')
        .gte('paid_at', todayStart.toISOString())
        .lte('paid_at', todayEnd.toISOString()),

      service.from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId),

      service.from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('scheduled_at', monthStart.toISOString()),

      service.from('payments')
        .select('amount')
        .eq('org_id', orgId)
        .eq('status', 'completed')
        .gte('paid_at', monthStart.toISOString()),

      service.from('visits')
        .select('price')
        .eq('org_id', orgId)
        .eq('status', 'completed')
        .eq('payment_status', 'unpaid'),

      service.from('visits')
        .select(`
          id, scheduled_at, status, service_type, price,
          clients(first_name, last_name, phone),
          visit_services(service_name, service_name_ru, price, duration_minutes)
        `)
        .eq('org_id', orgId)
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', todayEnd.toISOString())
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_at', { ascending: true })
        .limit(10),

      // топ-услуги: visit_services завершённых визитов за месяц
      service.from('visit_services')
        .select('service_name_ru, service_name, price, visits!inner(org_id, scheduled_at, status)')
        .eq('visits.org_id', orgId)
        .eq('visits.status', 'completed')
        .gte('visits.scheduled_at', monthStart.toISOString()),

      // новые клиенты
      service.from('clients')
        .select('id, first_name, last_name, phone, created_at, source')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5),

      // должники: completed + unpaid, с клиентом
      service.from('visits')
        .select('id, price, scheduled_at, clients(id, first_name, last_name, phone)')
        .eq('org_id', orgId)
        .eq('status', 'completed')
        .eq('payment_status', 'unpaid')
        .not('client_id', 'is', null)
        .order('scheduled_at', { ascending: false })
        .limit(30),

      // клиенты с birthday
      service.from('clients')
        .select('id, first_name, last_name, birthday')
        .eq('org_id', orgId)
        .not('birthday', 'is', null),

      // WhatsApp непрочитанные
      service.from('wa_conversations')
        .select('id, phone, contact_name, last_message_text, last_message_at, unread_count')
        .eq('org_id', orgId)
        .gt('unread_count', 0)
        .order('last_message_at', { ascending: false })
        .limit(5),
    ])

    // ── today ─────────────────────────────────────────────────────────────────
    const todayRevenue = (revenueToday.data ?? []).reduce((s: number, p: any) => s + (p.amount || 0), 0)
    const monthRevenue = (revenueMonth.data ?? []).reduce((s: number, p: any) => s + (p.amount || 0), 0)
    const totalDebt    = (debts.data ?? []).reduce((s: number, p: any) => s + (p.price || 0), 0)

    const upcoming = (upcomingVisits.data ?? []).map((v: any) => {
      const client = v.clients
      const svc    = v.visit_services?.[0]
      const time   = new Date(v.scheduled_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      return {
        id:           v.id,
        time,
        scheduled_at: v.scheduled_at,
        status:       v.status,
        price:        v.price ?? svc?.price ?? 0,
        client_name:  client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'Клиент',
        client_phone: client?.phone ?? null,
        service_name: svc?.service_name_ru ?? svc?.service_name ?? v.service_type ?? '',
      }
    })

    // ── top_services ──────────────────────────────────────────────────────────
    const svcMap: Record<string, { name: string; revenue: number; count: number }> = {}
    for (const row of (topServicesRaw.data ?? [])) {
      const name = (row.service_name_ru || row.service_name || 'Услуга') as string
      if (!svcMap[name]) svcMap[name] = { name, revenue: 0, count: 0 }
      svcMap[name].revenue += Number(row.price) || 0
      svcMap[name].count   += 1
    }
    const topServices = Object.values(svcMap).sort((a, b) => b.revenue - a.revenue).slice(0, 3)
    const maxRev = topServices[0]?.revenue || 1

    // ── new_clients ───────────────────────────────────────────────────────────
    const newClients = (newClientsRaw.data ?? []).map((c: any) => ({
      id:         c.id,
      name:       `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Клиент',
      phone:      c.phone ?? null,
      source:     c.source ?? null,
      created_at: c.created_at,
    }))

    // ── debtors ───────────────────────────────────────────────────────────────
    const debtorMap: Record<string, { id: string; name: string; phone: string | null; debt: number; last_visit: string }> = {}
    for (const v of (debtorsRaw.data ?? [])) {
      const c = v.clients as any
      if (!c) continue
      const cid = c.id as string
      if (!debtorMap[cid]) debtorMap[cid] = {
        id:         cid,
        name:       `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Клиент',
        phone:      c.phone ?? null,
        debt:       0,
        last_visit: v.scheduled_at,
      }
      debtorMap[cid].debt += Number(v.price) || 0
    }
    const debtors = Object.values(debtorMap).sort((a, b) => b.debt - a.debt).slice(0, 5)

    // ── birthdays ─────────────────────────────────────────────────────────────
    const pad = (n: number) => String(n).padStart(2, '0')
    const todayMD   = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const weekEndMD = `${pad(weekEnd.getMonth() + 1)}-${pad(weekEnd.getDate())}`
    const birthdays = (allClientsWithBd.data ?? [])
      .filter((c: any) => {
        const bd = String(c.birthday).slice(5) // MM-DD
        return todayMD <= weekEndMD
          ? bd >= todayMD && bd <= weekEndMD
          : bd >= todayMD || bd <= weekEndMD
      })
      .map((c: any) => {
        const bd     = String(c.birthday)
        const bDate  = new Date(now.getFullYear(), parseInt(bd.slice(5, 7)) - 1, parseInt(bd.slice(8, 10)))
        const daysLeft = Math.round((bDate.getTime() - todayStart.getTime()) / 86400000)
        return {
          id:        c.id,
          name:      `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Клиент',
          birthday:  c.birthday,
          days_left: daysLeft,
        }
      })
      .sort((a: any, b: any) => a.days_left - b.days_left)
      .slice(0, 5)

    // ── whatsapp ──────────────────────────────────────────────────────────────
    const waList = (waConversations.data ?? []).map((conv: any) => ({
      id:              conv.id,
      phone:           conv.phone,
      contact_name:    conv.contact_name ?? null,
      last_message:    conv.last_message_text ?? '',
      last_message_at: conv.last_message_at,
      unread_count:    conv.unread_count ?? 0,
    }))
    const waTotalUnread = waList.reduce((s: number, c: any) => s + c.unread_count, 0)

    return NextResponse.json({
      today: {
        visits_count:    visitsToday.count ?? 0,
        revenue:         todayRevenue,
        upcoming_visits: upcoming,
      },
      stats: {
        total_clients: clientsTotal.count ?? 0,
        visits_month:  visitsMonth.count  ?? 0,
        revenue_month: monthRevenue,
        total_debt:    totalDebt,
      },
      top_services: topServices.map(s => ({
        name:    s.name,
        revenue: s.revenue,
        count:   s.count,
        bar_pct: Math.round((s.revenue / maxRev) * 100),
      })),
      new_clients: newClients,
      debtors,
      birthdays,
      whatsapp: {
        total_unread:  waTotalUnread,
        conversations: waList,
      },
    })
  } catch (err: any) {
    console.error('[mobile/dashboard] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
