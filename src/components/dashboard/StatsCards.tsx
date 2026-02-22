import { createClient } from '@/lib/supabase/server'
import StatsCardsClient from './StatsCardsClient'

export default async function StatsCards({ orgId }: { orgId: string }) {
  const supabase = await createClient()

  // Date ranges
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  // Parallel queries for current month
  const [clientsResult, visitsResult, revenueResult, paidVisitsResult] = await Promise.all([
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId),
    supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('scheduled_at', currentMonthStart.toISOString()),
    supabase
      .from('payments')
      .select('amount')
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .gte('paid_at', currentMonthStart.toISOString()),
    supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .gte('scheduled_at', currentMonthStart.toISOString()),
  ])

  // Parallel queries for previous month
  const [clientsPrevResult, visitsPrevResult, revenuePrevResult, paidVisitsPrevResult] = await Promise.all([
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .lt('created_at', currentMonthStart.toISOString()),
    supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('scheduled_at', previousMonthStart.toISOString())
      .lt('scheduled_at', currentMonthStart.toISOString()),
    supabase
      .from('payments')
      .select('amount')
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .gte('paid_at', previousMonthStart.toISOString())
      .lte('paid_at', previousMonthEnd.toISOString()),
    supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .gte('scheduled_at', previousMonthStart.toISOString())
      .lt('scheduled_at', currentMonthStart.toISOString()),
  ])

  // Calculate current values
  const clientsCount = clientsResult.count ?? 0
  const visitsCount = visitsResult.count ?? 0
  const totalRevenue = revenueResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0
  const paidVisitsCount = paidVisitsResult.count ?? 0
  const avgCheck = paidVisitsCount > 0 ? Math.round(totalRevenue / paidVisitsCount) : 0

  // Calculate previous values
  const clientsPrevCount = clientsPrevResult.count ?? 0
  const visitsPrevCount = visitsPrevResult.count ?? 0
  const totalRevenuePrev = revenuePrevResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0
  const paidVisitsPrevCount = paidVisitsPrevResult.count ?? 0
  const avgCheckPrev = paidVisitsPrevCount > 0 ? Math.round(totalRevenuePrev / paidVisitsPrevCount) : 0

  // Calculate percentage changes
  const clientsChange = clientsPrevCount > 0 ? ((clientsCount - clientsPrevCount) / clientsPrevCount * 100) : 0
  const visitsChange = visitsPrevCount > 0 ? ((visitsCount - visitsPrevCount) / visitsPrevCount * 100) : 0
  const revenueChange = totalRevenuePrev > 0 ? ((totalRevenue - totalRevenuePrev) / totalRevenuePrev * 100) : 0
  const avgCheckChange = avgCheckPrev > 0 ? ((avgCheck - avgCheckPrev) / avgCheckPrev * 100) : 0

  return (
    <StatsCardsClient
      clients={{
        value: clientsCount,
        change: Number(clientsChange.toFixed(1)),
      }}
      visits={{
        value: visitsCount,
        change: Number(visitsChange.toFixed(1)),
      }}
      revenue={{
        value: totalRevenue,
        change: Number(revenueChange.toFixed(1)),
      }}
      avgCheck={{
        value: avgCheck,
        change: Number(avgCheckChange.toFixed(1)),
      }}
    />
  )
}
