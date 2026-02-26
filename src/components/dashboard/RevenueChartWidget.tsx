'use client'

import { WidgetCard } from '@/components/ui/WidgetCard'

interface RevenueChartWidgetProps {
  data: Array<{ date: string; amount: number }>
  locale: string
}

/**
 * Функция расчёта высоты бара
 * @param value - значение текущего бара
 * @param max - максимальное значение в данных
 * @returns высота в процентах (0-100)
 */
function calculateHeight(value: number, max: number): number {
  if (max === 0 || value === 0) return 0
  return (value / max) * 100
}

export function RevenueChartWidget({ data, locale }: RevenueChartWidgetProps) {
  const l = locale === 'he'
  const maxAmount = Math.max(...data.map(d => d.amount), 1)

  return (
    <WidgetCard className="p-4">
      <h3 className="text-sm font-semibold mb-4">
        {l ? 'הכנסות 7 ימים אחרונים' : 'Доход за 7 дней'}
      </h3>
      
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          {l ? 'אין נתונים' : 'Нет данных'}
        </p>
      ) : (
        <div className="space-y-2">
          {/* Контейнер графика с flex items-end */}
          <div className="h-[140px] flex items-end justify-between gap-2">
            {data.map((d, i) => {
              const heightPercent = calculateHeight(d.amount, maxAmount)
              
              return (
                <div 
                  key={i} 
                  className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500 ease-in-out min-h-[4px]"
                  style={{ height: `${heightPercent}%` }}
                  title={`${d.amount > 0 ? `₪${d.amount}` : '₪0'}`}
                />
              )
            })}
          </div>
          
          {/* Дни недели под графиком */}
          <div className="flex justify-between gap-2">
            {data.map((d, i) => (
              <div key={i} className="flex-1 text-center">
                <span className="text-[10px] text-slate-400">
                  {new Date(d.date).toLocaleDateString(l ? 'he-IL' : 'ru-RU', { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
          
          {/* Суммы под днями недели */}
          <div className="flex justify-between gap-2">
            {data.map((d, i) => (
              <div key={i} className="flex-1 text-center">
                <span className="text-[10px] text-slate-600 font-medium">
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
