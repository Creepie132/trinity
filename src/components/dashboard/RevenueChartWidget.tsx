'use client'

import { useState } from 'react'
import { WidgetCard } from '@/components/ui/WidgetCard'

interface RevenueChartWidgetProps {
  data: Array<{ date: string; amount: number }>
  locale: string
}

function calculateHeight(value: number, max: number): number {
  if (max === 0 || value === 0) return 2
  return Math.max((value / max) * 100, 4)
}

export function RevenueChartWidget({ data, locale }: RevenueChartWidgetProps) {
  const l = locale === 'he'
  const maxAmount = Math.max(...data.map(d => d.amount), 1)
  const totalRevenue = data.reduce((s, d) => s + d.amount, 0)
  const [hovered, setHovered] = useState<number | null>(null)

  // Цвет столбца по значению: зелёный если выше среднего, синий иначе
  const avg = totalRevenue / (data.filter(d => d.amount > 0).length || 1)

  const getBarColor = (amount: number, idx: number) => {
    const isToday = idx === data.length - 1
    if (isToday) return 'from-indigo-500 to-indigo-400'
    if (amount === 0) return 'from-gray-100 to-gray-200'
    if (amount >= avg * 1.2) return 'from-emerald-500 to-emerald-400'
    return 'from-blue-500 to-blue-400'
  }

  return (
    <WidgetCard className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {l ? 'הכנסות 7 ימים' : 'Доход за 7 дней'}
        </h3>
        {totalRevenue > 0 && (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg">
            ₪{totalRevenue.toLocaleString()}
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">{l ? 'אין נתונים' : 'Нет данных'}</p>
      ) : (
        <div className="space-y-2">
          {/* График */}
          <div className="h-[120px] flex items-end justify-between gap-1.5">
            {data.map((d, i) => {
              const h = calculateHeight(d.amount, maxAmount)
              const isHovered = hovered === i
              const isToday = i === data.length - 1
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}>

                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 pointer-events-none
                      bg-gray-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap shadow-lg">
                      {d.amount > 0 ? `₪${d.amount.toLocaleString()}` : l ? 'אין' : 'Нет'}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </div>
                  )}

                  {/* Столбец */}
                  <div className="w-full flex items-end" style={{ height: '108px' }}>
                    <div
                      className={`w-full rounded-t-lg bg-gradient-to-t transition-all duration-700 ease-out
                        ${getBarColor(d.amount, i)}
                        ${isHovered ? 'opacity-100 scale-x-105' : d.amount === 0 ? 'opacity-40' : 'opacity-90'}
                        ${isToday ? 'shadow-md shadow-indigo-200' : ''}`}
                      style={{
                        height: `${h}%`,
                        animationDelay: `${i * 80}ms`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Подписи дней */}
          <div className="flex justify-between gap-1.5">
            {data.map((d, i) => {
              const isToday = i === data.length - 1
              return (
                <div key={i} className="flex-1 text-center">
                  <span className={`text-[10px] font-medium ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {isToday
                      ? (l ? 'היום' : 'Сег')
                      : new Date(d.date).toLocaleDateString(l ? 'he-IL' : 'ru-RU', { weekday: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Суммы */}
          <div className="flex justify-between gap-1.5">
            {data.map((d, i) => (
              <div key={i} className="flex-1 text-center">
                <span className={`text-[10px] font-semibold ${d.amount > 0 ? 'text-slate-700 dark:text-slate-300' : 'text-slate-300'}`}>
                  {d.amount > 0 ? `₪${d.amount}` : '–'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  )
}
