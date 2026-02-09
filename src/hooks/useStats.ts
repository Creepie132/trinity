import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
const supabase = createSupabaseBrowserClient()

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Get current month dates
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Total clients
      const { count: totalClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })

      // Visits this month
      const { count: visitsThisMonth } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .gte('visit_date', firstDay.toISOString())
        .lte('visit_date', lastDay.toISOString())

      // Revenue this month
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('paid_at', firstDay.toISOString())
        .lte('paid_at', lastDay.toISOString())

      const revenueThisMonth = paymentsData?.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      ) || 0

      // Inactive clients (no visits in 30+ days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count: inactiveClients } = await supabase
        .from('client_summary')
        .select('*', { count: 'exact', head: true })
        .or(`last_visit.is.null,last_visit.lt.${thirtyDaysAgo.toISOString()}`)

      return {
        totalClients: totalClients || 0,
        visitsThisMonth: visitsThisMonth || 0,
        revenueThisMonth,
        inactiveClients: inactiveClients || 0,
      }
    },
  })
}

export function useRevenueByMonth() {
  return useQuery({
    queryKey: ['revenue-by-month'],
    queryFn: async () => {
      // Get last 6 months
      const months = []
      const now = new Date()

      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        const { data } = await supabase
          .from('payments')
          .select('amount')
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
  })
}

export function useVisitsByMonth() {
  return useQuery({
    queryKey: ['visits-by-month'],
    queryFn: async () => {
      // Get last 6 months
      const months = []
      const now = new Date()

      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        const { count } = await supabase
          .from('visits')
          .select('*', { count: 'exact', head: true })
          .gte('visit_date', firstDay.toISOString())
          .lte('visit_date', lastDay.toISOString())

        months.push({
          month: date.toLocaleDateString('he-IL', { month: 'short', year: 'numeric' }),
          count: count || 0,
        })
      }

      return months
    },
  })
}

export function useTopClients() {
  return useQuery({
    queryKey: ['top-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_summary')
        .select('id, first_name, last_name, total_paid')
        .order('total_paid', { ascending: false })
        .limit(5)

      if (error) throw error

      return data?.map((client) => ({
        name: `${client.first_name} ${client.last_name}`,
        amount: Number(client.total_paid),
      })) || []
    },
  })
}
