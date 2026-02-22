'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Users, Calendar, DollarSign, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'

interface StatData {
  value: number | string
  change: number
}

interface StatsCardsClientProps {
  clients: StatData
  visits: StatData
  revenue: StatData
  avgCheck: StatData
}

export default function StatsCardsClient({ clients, visits, revenue, avgCheck }: StatsCardsClientProps) {
  const { language } = useLanguage()

  const translations = {
    he: {
      clients: 'לקוחות',
      visits: 'ביקורים החודש',
      revenue: 'הכנסות',
      avgCheck: 'צ\'ק ממוצע',
    },
    ru: {
      clients: 'Клиенты',
      visits: 'Визиты за месяц',
      revenue: 'Выручка',
      avgCheck: 'Средний чек',
    },
  }

  const t = translations[language]

  const statCards = [
    {
      title: t.clients,
      value: clients.value,
      change: clients.change,
      icon: Users,
      iconColor: 'text-blue-500',
      href: '/clients',
    },
    {
      title: t.visits,
      value: visits.value,
      change: visits.change,
      icon: Calendar,
      iconColor: 'text-green-500',
      href: '/visits',
    },
    {
      title: t.revenue,
      value: typeof revenue.value === 'number' ? `₪${revenue.value.toLocaleString()}` : revenue.value,
      change: revenue.change,
      icon: DollarSign,
      iconColor: 'text-purple-500',
      href: '/payments',
    },
    {
      title: t.avgCheck,
      value: typeof avgCheck.value === 'number' ? `₪${avgCheck.value.toLocaleString()}` : avgCheck.value,
      change: avgCheck.change,
      icon: TrendingUp,
      iconColor: 'text-amber-500',
      href: '/payments',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {statCards.map((card, index) => {
        const Icon = card.icon
        const isPositive = card.change >= 0
        const hasChange = card.change !== 0

        return (
          <Link key={index} href={card.href}>
            <Card className="bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <Icon className={`w-5 h-5 ${card.iconColor} flex-shrink-0 mt-0.5 opacity-70`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{card.value}</p>
                    {hasChange ? (
                      <span className={`text-xs flex items-center gap-0.5 ${
                        isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                      }`}>
                        {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(card.change)}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
