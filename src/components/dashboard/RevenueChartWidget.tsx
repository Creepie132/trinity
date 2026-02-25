'use client'

interface RevenueChartWidgetProps {
  data: Array<{ date: string; amount: number }>
  locale: string
}

export function RevenueChartWidget({ data, locale }: RevenueChartWidgetProps) {
  const l = locale === 'he'
  const maxAmount = Math.max(...data.map(d => d.amount), 1)

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <h3 className="text-sm font-semibold mb-4">
        {l ? 'הכנסות 7 ימים אחרונים' : 'Доход за 7 дней'}
      </h3>
      
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          {l ? 'אין נתונים' : 'Нет данных'}
        </p>
      ) : (
        <div className="flex items-end justify-between gap-2 h-40">
          {data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-400 font-medium">
                {d.amount > 0 ? `₪${d.amount}` : ''}
              </span>
              <div 
                className="w-full bg-blue-500 rounded-t-lg transition-all min-h-[4px]"
                style={{ height: `${(d.amount / maxAmount) * 100}%` }}
              />
              <span className="text-[10px] text-slate-400">
                {new Date(d.date).toLocaleDateString(l ? 'he-IL' : 'ru-RU', { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
