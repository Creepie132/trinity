'use client'

import { useState } from 'react'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { Calendar, Clock, CheckCircle2, Circle, Play } from 'lucide-react'

interface TodayVisitsWidgetProps {
  visits: any[]
  locale: string
  onVisitClick?: (visit: any) => void
}

const STATUS_CONFIG = {
  scheduled:   { dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700',   icon: Circle,        ru: 'Ожидает', he: 'מתוכנן' },
  in_progress: { dot: 'bg-amber-500 animate-pulse', badge: 'bg-amber-100 text-amber-700', icon: Play, ru: 'Идёт', he: 'פעיל' },
  completed:   { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, ru: 'Готово', he: 'הושלם' },
  cancelled:   { dot: 'bg-gray-300',   badge: 'bg-gray-100 text-gray-400',   icon: Circle,        ru: 'Отменён', he: 'בוטל' },
}

export function TodayVisitsWidget({ visits, locale, onVisitClick }: TodayVisitsWidgetProps) {
  const l = locale === 'he'
  const [page, setPage] = useState(0)
  const perPage = 4
  const totalPages = Math.ceil(visits.length / perPage)
  const current = visits.slice(page * perPage, (page + 1) * perPage)

  const activeCount = visits.filter(v => v.status === 'in_progress').length
  const doneCount = visits.filter(v => v.status === 'completed').length

  return (
    <WidgetCard className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {l ? 'ביקורים היום' : 'Визиты сегодня'}
            </h3>
            {visits.length > 0 && (
              <p className="text-xs text-gray-400">
                {doneCount}/{visits.length} {l ? 'הושלמו' : 'завершено'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {activeCount} {l ? 'פעיל' : 'активно'}
            </span>
          )}
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center">
            {visits.length}
          </span>
        </div>
      </div>

      {visits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">{l ? 'אין ביקורים היום' : 'Нет визитов сегодня'}</p>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          {visits.length > 0 && (
            <div className="mb-3 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${(doneCount / visits.length) * 100}%` }}
              />
            </div>
          )}

          <div className="space-y-1.5">
            {current.map((v: any) => {
              const status = STATUS_CONFIG[v.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.scheduled
              const StatusIcon = status.icon
              const time = new Date(v.scheduled_at).toLocaleTimeString(l ? 'he-IL' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })
              const name = v.clients ? `${v.clients.first_name || ''} ${v.clients.last_name || ''}`.trim() : v.clientName || '—'

              return (
                <div
                  key={v.id}
                  onClick={() => onVisitClick?.(v)}
                  className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-all duration-150 active:scale-[0.98]"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{name}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {time}
                      {v.service_name && <span>· {v.service_name}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.badge}`}>
                    {l ? status.he : status.ru}
                  </span>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className={`h-1.5 rounded-full transition-all duration-200 ${page === i ? 'bg-blue-500 w-5' : 'bg-gray-200 w-1.5'}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </WidgetCard>
  )
}
