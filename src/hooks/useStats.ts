import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from './useAuth'
const supabase = createSupabaseBrowserClient()

export function useDashboardStats() {
  const { orgId } = useAuth()

  return useQuery({
    queryKey: ['dashboard-stats', orgId],
    queryFn: async () => {
      // CRITICAL: Require orgId to prevent showing data from all orgs
      if (!orgId) {
        console.warn('[useDashboardStats] No orgId - returning zeros')
        return {
          totalClients: 0,
          visitsThisMonth: 0,
          revenueThisMonth: 0,
          inactiveClients: 0,
        }
      }

      console.log('[useDashboardStats] Loading stats for org:', orgId)

      // Get current month dates
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Total clients (filtered by org_id)
      const { count: totalClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)

      // Visits this month (filtered by org_id via clients.org_id)
      const { count: visitsThisMonth } = await supabase
        .from('visits')
        .select('*, clients!inner(org_id)', { count: 'exact', head: true })
        .eq('clients.org_id', orgId)
        .gte('visit_date', firstDay.toISOString())
        .lte('visit_date', lastDay.toISOString())

      // Revenue this month (filtered by org_id via clients.org_id)
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount, clients!inner(org_id)')
        .eq('clients.org_id', orgId)
        .eq('status', 'completed')
        .gte('paid_at', firstDay.toISOString())
        .lte('paid_at', lastDay.toISOString())

      const revenueThisMonth = paymentsData?.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      ) || 0

      // Inactive clients (no visits in 30+ days, filtered by org_id)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count: inactiveClients } = await supabase
        .from('client_summary')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .or(`last_visit.is.null,last_visit.lt.${thirtyDaysAgo.toISOString()}`)

      console.log('[useDashboardStats] Stats loaded:', {
        totalClients,
        visitsThisMonth,
        revenueThisMonth,
        inactiveClients,
      })

      return {
        totalClients: totalClients || 0,
        visitsThisMonth: visitsThisMonth || 0,
        revenueThisMonth,
        inactiveClients: inactiveClients || 0,
      }
    },
    enabled: !!orgId, // Only run query if orgId exists
  })
}

export function useRevenueByMonth() {
  const { orgId } = useAuth()

  return useQuery({
    queryKey: ['revenue-by-month', orgId],
    queryFn: async () => {
      if (!orgId) {
        console.warn('[useRevenueByMonth] No orgId - returning empty')
        return []
      }

      // Get last 6 months
      const months = []
      const now = new Date()

      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        const { data } = await supabase
          .from('payments')
          .select('amount, clients!inner(org_id)')
          .eq('clients.org_id', orgId)
          .eq('status', 'completed')
          .gte('paid_at', firstDay.toISOString())
          .lte('paid_at', lastDay.toISOString())

        const total = data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

        months.push({
          month: date.toLocaleDateString('he-IL', { month: 'short', year: 'numeric' }),
          amount: total,
        })
      }

      return months
    },
    enabled: !!orgId,
  })
}

export function useVisitsByMonth() {
  const { orgId } = useAuth()

  return useQuery({
    queryKey: ['visits-by-month', orgId],
    queryFn: async () => {
      if (!orgId) {
        console.warn('[useVisitsByMonth] No orgId - returning empty')
        return []
      }

      // Get last 6 months
      const months = []
      const now = new Date()

      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        const { count } = await supabase
          .from('visits')
          .select('*, clients!inner(org_id)', { count: 'exact', head: true })
          .eq('clients.org_id', orgId)
          .gte('visit_date', firstDay.toISOString())
          .lte('visit_date', lastDay.toISOString())

        months.push({
          month: date.toLocaleDateString('he-IL', { month: 'short', year: 'numeric' }),
          count: count || 0,
        })
      }

      return months
    },
    enabled: !!orgId,
  })
}

export function useTopClients() {
  const { orgId } = useAuth()

  return useQuery({
    queryKey: ['top-clients', orgId],
    queryFn: async () => {
      if (!orgId) {
        console.warn('[useTopClients] No orgId - returning empty')
        return []
      }

      const { data, error } = await supabase
        .from('client_summary')
        .select('id, first_name, last_name, total_paid, org_id')
        .eq('org_id', orgId)
        .order('total_paid', { ascending: false })
        .limit(5)

      if (error) throw error

      return data?.map((client) => ({
        name: `${client.first_name} ${client.last_name}`,
        amount: Number(client.total_paid),
      })) || []
    },
    enabled: !!orgId,
  })
}
