'use client'

import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import { useLanguage } from '@/contexts/LanguageContext'
import { format, parseISO } from 'date-fns'
import { he, ru } from 'date-fns/locale'
import { TrendingUp } from 'lucide-react'

interface ChartDay { date: string; income: number; expense: number }

const t = {
  he: { title: 'הכנסות לעומת הוצאות', income: 'הכנסות', expense: 'הוצאות', noData: 'אין נתונים' },
  ru: { title: 'Доходы vs Расходы', income: 'Доходы', expense: 'Расходы', noData: 'Нет данных' },
}

function useChartData(month: string) {
  return useQuery<ChartDay[]>({
    queryKey: ['finances-chart', month],
    queryFn: async () => {
      const res = await fetch(`/api/finances/chart?month=${month}`)
      if (!res.ok) throw new Error('chart fetch failed')
      const data = await res.json()
      return data.days ?? []
    },
    staleTime: 60_000,
  })
}

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  lang: 'he' | 'ru'
}

function CustomTooltip({ active, payload, label, lang }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const tx = t[lang]
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-xl min-w-[140px]">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {entry.name === 'income' ? tx.income : tx.expense}
            </span>
          </div>
          <span className="text-xs font-bold tabular-nums" style={{ color: entry.color }}>
            ₪{Number(entry.value).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </div>
  )
}

interface FinancesChartProps { month: string }

export function FinancesChart({ month }: FinancesChartProps) {
  const { language } = useLanguage()
  const lang = language === 'he' ? 'he' : 'ru'
  const tx = t[lang]
  const locale = lang === 'he' ? he : ru
  const { data: days = [], isLoading } = useChartData(month)

  // Format date label for axis
  const formatDay = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'd', { locale })
    } catch { return dateStr }
  }

  // Show only every 3rd tick on X to avoid crowding
  const tickDays = days.filter((_, i) => i % 3 === 0).map(d => d.date)

  const hasData = days.some(d => d.income > 0 || d.expense > 0)

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="h-52 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm font-semibold text-gray-800 dark:text-white">{tx.title}</p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">{tx.income}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">{tx.expense}</span>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="h-52 flex items-center justify-center text-gray-400 text-sm">{tx.noData}</div>
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={days} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDay}
              ticks={tickDays}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v === 0 ? '0' : `₪${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`}
            />
            <Tooltip
              content={<CustomTooltip lang={lang} />}
              cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="income"
              name="income"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#gradIncome)"
              dot={false}
              activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              animationDuration={800}
              animationEasing="ease-out"
            />
            <Area
              type="monotone"
              dataKey="expense"
              name="expense"
              stroke="#f43f5e"
              strokeWidth={2.5}
              fill="url(#gradExpense)"
              dot={false}
              activeDot={{ r: 5, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
