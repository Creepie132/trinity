'use client'

import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Deal {
  id: string
  title?: string
  client_name?: string
  amount?: number
  status?: string
  created_at?: string
}

const STATUS_COLORS: Record<string, string> = {
  won:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  lost:     'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  active:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pending:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  new:      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const STATUS_LABELS: Record<string, { he: string; ru: string }> = {
  won:     { he: 'נסגר',   ru: 'Закрыта' },
  lost:    { he: 'אבד',    ru: 'Потеряна' },
  active:  { he: 'פעיל',   ru: 'Активна' },
  pending: { he: 'ממתין',  ru: 'Ожидание' },
  new:     { he: 'חדש',    ru: 'Новая' },
}

export function RecentDealsWidget({ locale }: { locale: string }) {
  const l = locale === 'he'

  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ['recent-deals-widget'],
    queryFn: async () => {
      const res = await fetch('/api/deals?limit=5&sort=created_at:desc')
      if (!res.ok) return []
      const data = await res.json()
      return data.deals ?? data ?? []
    },
    staleTime: 2 * 60_000,
  })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <TrendingUp size={16} className="text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">
            {l ? '5 עסקאות אחרונות' : 'Последние 5 сделок'}
          </h3>
        </div>
        <Link href="/sales" className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
          {l ? 'כל העסקאות' : 'Все сделки'}
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-2/3" />
              <div className="h-2.5 bg-gray-100 dark:bg-slate-700 rounded w-1/3" />
            </div>
          </div>
        ))}

        {!isLoading && deals.length === 0 && (
          <div className="text-center py-8 text-gray-400 dark:text-slate-500">
            <ShoppingBag size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">{l ? 'אין עסקאות עדיין' : 'Сделок пока нет'}</p>
          </div>
        )}

        {!isLoading && deals.map((deal) => {
          const status = deal.status ?? 'new'
          const statusCls = STATUS_COLORS[status] ?? STATUS_COLORS.new
          const statusLabel = (STATUS_LABELS[status] ?? STATUS_LABELS.new)[l ? 'he' : 'ru']
          const date = deal.created_at
            ? new Date(deal.created_at).toLocaleDateString(l ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'short' })
            : ''

          return (
            <Link key={deal.id} href="/sales"
              className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                <ShoppingBag size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                  {deal.title || deal.client_name || (l ? 'עסקה' : 'Сделка')}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{date}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {deal.amount != null && (
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    ₪{deal.amount.toLocaleString()}
                  </span>
                )}
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', statusCls)}>
                  {statusLabel}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
