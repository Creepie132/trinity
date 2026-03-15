import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { getActiveOrgId } from '@/lib/get-active-org'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'

// ─── Server-side data fetchers ────────────────────────────────────────────────

async function fetchStats(orgId: string) {
  const service = createSupabaseServiceClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  const [
    { count: clientsCount },
    { count: clientsPrevCount },
    { count: visitsCount },
    { count: visitsPrevCount },
    { data: revenueData },
    { data: revenuePrevData },
    { count: paidVisitsCount },
    { count: paidVisitsPrevCount },
  ] = await Promise.all([
    service.from('clients').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    service.from('clients').select('*', { count: 'exact', head: true }).eq('org_id', orgId).lt('created_at', monthStart),
    service.from('visits').select('*', { count: 'exact', head: true }).eq('org_id', orgId).gte('scheduled_at', monthStart),
    service.from('visits').select('*', { count: 'exact', head: true }).eq('org_id', orgId).gte('scheduled_at', prevMonthStart).lt('scheduled_at', monthStart),
    service.from('payments').select('amount').eq('org_id', orgId).eq('status', 'completed').gte('paid_at', monthStart),
    service.from('payments').select('amount').eq('org_id', orgId).eq('status', 'completed').gte('paid_at', prevMonthStart).lte('paid_at', prevMonthEnd),
    service.from('visits').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'completed').gte('scheduled_at', monthStart),
    service.from('visits').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'completed').gte('scheduled_at', prevMonthStart).lt('scheduled_at', monthStart),
  ])

  const revenue = revenueData?.reduce((s, p) => s + (p.amount || 0), 0) ?? 0
  const revenuePrev = revenuePrevData?.reduce((s, p) => s + (p.amount || 0), 0) ?? 0
  const avgCheck = paidVisitsCount ? revenue / paidVisitsCount : 0
  const avgCheckPrev = paidVisitsPrevCount ? revenuePrev / paidVisitsPrevCount : 0
  const clientsPrev = clientsPrevCount ?? 0
  const visitsPrev = visitsPrevCount ?? 0

  return {
    clients: { value: clientsCount ?? 0, change: clientsPrev > 0 ? +((((clientsCount ?? 0) - clientsPrev) / clientsPrev) * 100).toFixed(1) : 0 },
    visits:  { value: visitsCount ?? 0,  change: visitsPrev > 0  ? +((((visitsCount ?? 0) - visitsPrev) / visitsPrev) * 100).toFixed(1) : 0 },
    revenue: { value: revenue, change: revenuePrev > 0 ? +(((revenue - revenuePrev) / revenuePrev) * 100).toFixed(1) : 0 },
    avgCheck:{ value: Math.round(avgCheck), change: avgCheckPrev > 0 ? +(((avgCheck - avgCheckPrev) / avgCheckPrev) * 100).toFixed(1) : 0 },
  }
}

async function fetchToday(orgId: string) {
  const service = createSupabaseServiceClient()
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999)

  const { data } = await service
    .from('visits')
    .select('id, scheduled_at, status, notes, service_type, duration_minutes, price, org_id, clients(id, first_name, last_name, phone), services(id, name, name_ru, duration_minutes, price), visit_services(id, service_name, service_name_ru, duration_minutes, price)')
    .eq('org_id', orgId)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .in('status', ['scheduled', 'in_progress'])
    .order('scheduled_at', { ascending: true })
    .limit(10)

  return (data ?? []).map(visit => {
    const client: any = visit.clients
    return { ...visit, clientName: client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : '' }
  })
}

async function fetchRevenue(orgId: string) {
  const service = createSupabaseServiceClient()
  const days = 7
  const toIsraelKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
  const nowKey = toIsraelKey(new Date())
  const startMs = new Date(nowKey + 'T00:00:00+03:00').getTime() - (days - 1) * 86400000
  const fetchFrom = new Date(startMs - 3 * 3600000)

  const { data: payments } = await service
    .from('payments').select('amount, paid_at')
    .eq('org_id', orgId).eq('status', 'completed')
    .gte('paid_at', fetchFrom.toISOString()).order('paid_at')

  const dayNames = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
  const map: Record<string, number> = {}
  for (let i = 0; i < days; i++) {
    const d = new Date(startMs + i * 86400000)
    map[toIsraelKey(d)] = 0
  }
  payments?.forEach(p => {
    if (!p.paid_at) return
    const k = toIsraelKey(new Date(p.paid_at))
    if (map[k] !== undefined) map[k] += parseFloat(String(p.amount || 0))
  })

  return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).map(([date, amount]) => {
    const d = new Date(date + 'T12:00:00+03:00')
    return { date, day: dayNames[d.getDay()], dateLabel: `${d.getDate()}/${d.getMonth()+1}`, amount: Math.round(amount) }
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // org_id из JWT (быстро), fallback на таблицу
  let orgId = user.app_metadata?.org_id as string | undefined
  if (!orgId) {
    const { data: orgUser } = await supabase.from('org_users').select('org_id').eq('user_id', user.id).single()
    orgId = orgUser?.org_id
  }
  if (!orgId) redirect('/unauthorized')

  // Активный филиал — источник истины из БД
  const activeOrgId = await getActiveOrgId(user.id, orgId)

  // Все 3 запроса параллельно на сервере
  const [stats, todayVisits, revenueData] = await Promise.all([
    fetchStats(activeOrgId).catch(() => null),
    fetchToday(activeOrgId).catch(() => []),
    fetchRevenue(activeOrgId).catch(() => []),
  ])

  // Заполняем React Query cache на сервере — клиент получит данные без fetch
  const queryClient = new QueryClient()
  if (stats)        queryClient.setQueryData(['dashboard-stats',   activeOrgId], stats)
  if (todayVisits)  queryClient.setQueryData(['dashboard-today',   activeOrgId], todayVisits)
  if (revenueData)  queryClient.setQueryData(['dashboard-revenue', activeOrgId], revenueData)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardContent orgId={activeOrgId} />
    </HydrationBoundary>
  )
}
