import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Calendar, DollarSign, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'

interface StatData {
  value: number
  change: number
}

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

  const statCards = [
    {
      title: 'לקוחות',
      value: clientsCount,
      change: Number(clientsChange.toFixed(1)),
      icon: Users,
      iconColor: 'text-blue-500',
    },
    {
      title: 'ביקורים החודש',
      value: visitsCount,
      change: Number(visitsChange.toFixed(1)),
      icon: Calendar,
      iconColor: 'text-green-500',
    },
    {
      title: 'הכנסות',
      value: `₪${totalRevenue.toLocaleString()}`,
      change: Number(revenueChange.toFixed(1)),
      icon: DollarSign,
      iconColor: 'text-purple-500',
    },
    {
      title: 'צ\'ק ממוצע',
      value: `₪${avgCheck.toLocaleString()}`,
      change: Number(avgCheckChange.toFixed(1)),
      icon: TrendingUp,
      iconColor: 'text-amber-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {statCards.map((card, index) => {
        const Icon = card.icon
        const isPositive = card.change >= 0
        const hasChange = card.change !== 0

        return (
          <Card
            key={index}
            className="bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow"
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Icon className={`w-5 h-5 ${card.iconColor} flex-shrink-0 mt-0.5 opacity-70`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{card.value}</p>
                  {hasChange ? (
                    <div className="flex items-center gap-1">
                      <span className={`text-xs flex items-center gap-0.5 ${
                        isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                      }`}>
                        {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(card.change)}%
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-500">
                        לעומת חודש קודם
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
