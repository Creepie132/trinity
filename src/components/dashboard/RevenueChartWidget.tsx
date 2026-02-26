'use client'

interface RevenueChartWidgetProps {
  data: Array<{ date: string; amount: number }>
  locale: string
}

// Функция расчёта высоты бара в пикселях
function calculateHeight(value: number, max: number, maxHeight: number = 140): number {
  if (max === 0 || value === 0) return 4 // Минимальная высота 4px для пустых баров
  const ratio = value / max
  const calculatedHeight = ratio * maxHeight
  return Math.max(calculatedHeight, 4) // Всегда минимум 4px
}

export function RevenueChartWidget({ data, locale }: RevenueChartWidgetProps) {
  const l = locale === 'he'
  const maxAmount = Math.max(...data.map(d => d.amount), 1)
  const maxBarHeight = 140 // Максимальная высота бара в пикселях

  return (
    <div className="bg-white rounded-2xl border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
      <h3 className="text-sm font-semibold mb-4">
        {l ? 'הכנסות 7 ימים אחרונים' : 'Доход за 7 дней'}
      </h3>
      
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          {l ? 'אין נתונים' : 'Нет данных'}
        </p>
      ) : (
        <div className="flex items-end justify-between gap-2" style={{ height: `${maxBarHeight + 40}px` }}>
          {data.map((d, i) => {
            const barHeight = calculateHeight(d.amount, maxAmount, maxBarHeight)
            
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 justify-end">
                {/* Сумма над баром */}
                <span className="text-[10px] text-slate-400 font-medium mb-1">
                  {d.amount > 0 ? `₪${d.amount}` : ''}
                </span>
                
                {/* Бар с transition-all для плавной анимации */}
                <div 
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500 ease-in-out"
                  style={{ height: `${barHeight}px` }}
                />
                
                {/* День недели под баром */}
                <span className="text-[10px] text-slate-400 mt-1">
                  {new Date(d.date).toLocaleDateString(l ? 'he-IL' : 'ru-RU', { weekday: 'short' })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
