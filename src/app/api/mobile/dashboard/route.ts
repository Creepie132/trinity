/**
 * GET /api/mobile/dashboard
 * Мобильный дашборд — единый endpoint для Flutter приложения.
 * Возвращает: stats сегодня + общие stats орга.
 * Auth: Bearer токен из Authorization header.
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

    // Временные рамки
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Параллельные запросы к БД
    const [
      visitsToday,
      revenueToday,
      clientsTotal,
      visitsMonth,
      revenueMonth,
      debts,
      upcomingVisits,
    ] = await Promise.all([
      service
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('scheduled_at', todayStart.toISOString())
        .lte('scheduled_at', todayEnd.toISOString())
        .in('status', ['scheduled', 'in_progress', 'completed']),

      service
        .from('payments')
        .select('amount')
        .eq('org_id', orgId)
        .eq('status', 'completed')
        .gte('paid_at', todayStart.toISOString())
        .lte('paid_at', todayEnd.toISOString()),

      service
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId),


      service
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('scheduled_at', monthStart.toISOString()),

      service
        .from('payments')
        .select('amount')
        .eq('org_id', orgId)
        .eq('status', 'completed')
        .gte('paid_at', monthStart.toISOString()),

      service
        .from('visits')
        .select('price')
        .eq('org_id', orgId)
        .eq('status', 'completed')
        .eq('payment_status', 'unpaid'),

      service
        .from('visits')
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
    ])


    const todayRevenue = (revenueToday.data ?? []).reduce((s: number, p: any) => s + (p.amount || 0), 0)
    const monthRevenue = (revenueMonth.data ?? []).reduce((s: number, p: any) => s + (p.amount || 0), 0)
    const totalDebt    = (debts.data ?? []).reduce((s: number, p: any) => s + (p.price || 0), 0)

    const upcoming = (upcomingVisits.data ?? []).map((v: any) => {
      const client = v.clients
      const svc    = v.visit_services?.[0]
      const time   = new Date(v.scheduled_at).toLocaleTimeString('ru-RU', {
        hour: '2-digit', minute: '2-digit',
      })
      return {
        id:           v.id,
        time,
        scheduled_at: v.scheduled_at,
        status:       v.status,
        price:        v.price ?? svc?.price ?? 0,
        client_name:  client
          ? `${client.first_name || ''} ${client.last_name || ''}`.trim()
          : 'Клиент',
        client_phone: client?.phone ?? null,
        service_name: svc?.service_name_ru ?? svc?.service_name ?? v.service_type ?? '',
      }
    })

    return NextResponse.json({
      today: {
        visits_count:    visitsToday.count  ?? 0,
        revenue:         todayRevenue,
        upcoming_visits: upcoming,
      },
      stats: {
        total_clients: clientsTotal.count ?? 0,
        visits_month:  visitsMonth.count  ?? 0,
        revenue_month: monthRevenue,
        total_debt:    totalDebt,
      },
    })
  } catch (err: any) {
    console.error('[mobile/dashboard] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
