'use client'

import { Users, Calendar, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
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
      iconBg: 'bg-blue-50 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      href: '/clients',
    },
    {
      title: t.visits,
      value: visits.value,
      change: visits.change,
      icon: Calendar,
      iconBg: 'bg-green-50 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      href: '/visits',
    },
    {
      title: t.revenue,
      value: typeof revenue.value === 'number' ? `₪${revenue.value.toLocaleString()}` : revenue.value,
      change: revenue.change,
      icon: DollarSign,
      iconBg: 'bg-purple-50 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      href: '/payments',
    },
    {
      title: t.avgCheck,
      value: typeof avgCheck.value === 'number' ? `₪${avgCheck.value.toLocaleString()}` : avgCheck.value,
      change: avgCheck.change,
      icon: TrendingUp,
      iconBg: 'bg-amber-50 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      href: '/payments',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {statCards.map((card, index) => {
        const Icon = card.icon
        const isPositive = card.change >= 0
        const hasChange = card.change !== 0

        return (
          <Link key={index} href={card.href}>
            <div className="bg-card border rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                    <Icon size={16} className={card.iconColor} />
                  </div>
                  <span className="text-sm text-muted-foreground">{card.title}</span>
                </div>
                {/* Процент изменения */}
                {hasChange && (
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {Math.abs(card.change)}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
