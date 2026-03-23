'use client'

export interface CommissionData {
  month_total_fee:       number
  month_commission:      number
  count:                 number
  prev_month_commission: number
  percent_change:        number | null
  period:                { year: number; month: number }
}

function fmt(n: number) {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency', currency: 'ILS', maximumFractionDigits: 0,
  }).format(n)
}

function monthName(month: number, lang: string) {
  return new Date(2024, month - 1, 1).toLocaleString(
    lang === 'he' ? 'he-IL' : 'ru-RU', { month: 'long' }
  )
}

interface Props {
  lang:    string
  data:    CommissionData | null
  loading: boolean
}

export function CommissionWidget({ lang, data, loading }: Props) {
  const isHe = lang === 'he'

  const pct   = data?.percent_change
  const trend = pct == null ? null : pct >= 0 ? 'up' : 'down'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {isHe ? '💰 עמלה חודשית' : '💰 Моя комиссия'}
        </h2>
      </div>

      {loading && !data ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-1/2" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-3/4" />
        </div>
      ) : data ? (
        <>
          {/* Main number */}
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-emerald-600">
              {fmt(data.month_commission)}
            </span>
            {trend && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-1 ${
                trend === 'up'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-500'
              }`}>
                {trend === 'up' ? '▲' : '▼'} {Math.abs(pct!)}%
              </span>
            )}
          </div>

          {/* Setup fee total */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{isHe ? 'סה"כ עלות הקמה:' : 'Сумма подключений:'}</span>
            <span className="font-semibold text-gray-700">{fmt(data.month_total_fee)}</span>
          </div>

          {/* Deals closed */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{isHe ? 'עסקאות שנסגרו:' : 'Закрытых сделок:'}</span>
            <span className="font-semibold text-gray-700">{data.count}</span>
          </div>

          {/* Progress bar */}
          {data.prev_month_commission > 0 && (
            <div className="space-y-1">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${
                    data.month_commission >= data.prev_month_commission
                      ? 'bg-emerald-500'
                      : 'bg-amber-400'
                  }`}
                  style={{
                    width: `${Math.min(
                      Math.round((data.month_commission / data.prev_month_commission) * 100),
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-400 text-end">
                {isHe
                  ? `לעומת ${monthName(data.period.month - 1 || 12, lang)}: ${fmt(data.prev_month_commission)}`
                  : `vs ${monthName(data.period.month - 1 || 12, lang)}: ${fmt(data.prev_month_commission)}`}
              </p>
            </div>
          )}

          <p className="text-[10px] text-gray-400">
            {monthName(data.period.month, lang)} {data.period.year}
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-400">{isHe ? 'אין נתונים' : 'Нет данных'}</p>
      )}
    </div>
  )
}
