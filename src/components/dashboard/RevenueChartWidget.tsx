'use client'

import { TrendingUp } from 'lucide-react'

interface RevenueChartWidgetProps {
  data: Array<{ date: string; revenue: number }>
  locale: string
}

export function RevenueChartWidget({ data, locale }: RevenueChartWidgetProps) {
  const title = locale === 'he' ? 'הכנסות - 7 ימים' : 'Выручка - 7 дней'
  
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{title}</h3>
        <TrendingUp size={20} className="text-emerald-600" />
      </div>
      
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-12 shrink-0">{item.date}</span>
            <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-lg transition-all duration-500"
                style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-700 w-16 text-right">
              ₪{item.revenue.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
