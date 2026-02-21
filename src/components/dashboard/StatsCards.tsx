import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Calendar, DollarSign, TrendingUp } from 'lucide-react'

export default async function StatsCards({ orgId }: { orgId: string }) {
  const supabase = await createClient()

  // Parallel queries for stats
  const [clientsResult, visitsResult, revenueResult] = await Promise.all([
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId),
    supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('scheduled_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase
      .from('payments')
      .select('amount')
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  const clientsCount = clientsResult.count ?? 0
  const visitsCount = visitsResult.count ?? 0
  const totalRevenue = revenueResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0
  const avgCheck = visitsCount > 0 ? Math.round(totalRevenue / visitsCount) : 0

  const statCards = [
    {
      title: 'Клиентов',
      value: clientsCount,
      icon: Users,
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Визитов за месяц',
      value: visitsCount,
      icon: Calendar,
      bgColor: 'bg-green-500/10',
      iconColor: 'text-green-500',
    },
    {
      title: 'Выручка за месяц',
      value: `₪${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
    },
    {
      title: 'Средний чек',
      value: `₪${avgCheck.toLocaleString()}`,
      icon: TrendingUp,
      bgColor: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card
            key={index}
            className="bg-[#111827] border-gray-800 hover:border-gray-700 transition-all duration-200 hover:shadow-lg"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-white">{card.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${card.bgColor}`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
