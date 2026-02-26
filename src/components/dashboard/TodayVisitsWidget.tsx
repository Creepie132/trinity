'use client'

import { useState } from 'react'
import { WidgetCard } from '@/components/ui/WidgetCard'

interface TodayVisitsWidgetProps {
  visits: any[]
  locale: string
}

export function TodayVisitsWidget({ visits, locale }: TodayVisitsWidgetProps) {
  const l = locale === 'he'
  const [page, setPage] = useState(0)
  const perPage = 5
  const totalPages = Math.ceil(visits.length / perPage)
  const current = visits.slice(page * perPage, (page + 1) * perPage)

  return (
    <WidgetCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{l ? 'ביקורים להיום' : 'Визиты сегодня'}</h3>
        <span className="text-xs text-slate-400">{visits.length}</span>
      </div>
      
      {visits.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">{l ? 'אין ביקורים' : 'Нет визитов'}</p>
      ) : (
        <>
          <div className="space-y-2">
            {current.map((v: any) => (
              <div 
                key={v.id} 
                onClick={() => window.location.href = '/visits'}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  v.status === 'in_progress' ? 'bg-amber-500' : 
                  v.status === 'completed' ? 'bg-emerald-500' : 
                  'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {v.clients?.first_name} {v.clients?.last_name || v.clientName || '—'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(v.scheduled_at).toLocaleTimeString(l ? 'he-IL' : 'ru-RU', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  v.status === 'in_progress' ? 'bg-amber-500 text-white' : 
                  v.status === 'completed' ? 'bg-emerald-500 text-white' : 
                  'bg-blue-600 text-white'
                }`}>
                  {v.status === 'scheduled' ? (l ? 'מתוכנן' : 'План') : 
                   v.status === 'in_progress' ? (l ? 'פעיל' : 'Идёт') : 
                   (l ? 'הושלם' : 'Готов')}
                </span>
              </div>
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`h-2 rounded-full transition ${
                    page === i ? 'bg-blue-600 w-6' : 'bg-slate-200 w-2'
                  }`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </WidgetCard>
  )
}
