import { Card, CardContent } from '@/components/ui/card'
import { Users, Calendar, DollarSign, TrendingUp } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getStats(orgId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://ambersol.co.il'}/api/dashboard/stats?org_id=${orgId}`,
    { next: { revalidate: 60 } } // Cache for 60 seconds
  )
  
  if (!response.ok) {
    return {
      totalClients: 0,
      visitsThisMonth: 0,
      revenueThisMonth: 0,
      averageCheck: 0,
    }
  }
  
  return response.json()
}

export async function StatsCards({ orgId }: { orgId: string }) {
  const stats = await getStats(orgId)

  const statCards = [
    {
      title: 'Клиентов',
      value: stats.totalClients || 0,
      icon: Users,
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Визитов за месяц',
      value: stats.visitsThisMonth || 0,
      icon: Calendar,
      bgColor: 'bg-green-500/10',
      iconColor: 'text-green-500',
    },
    {
      title: 'Выручка за месяц',
      value: `₪${(stats.revenueThisMonth || 0).toLocaleString()}`,
      icon: DollarSign,
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
    },
    {
      title: 'Средний чек',
      value: `₪${(stats.averageCheck || 0).toLocaleString()}`,
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
