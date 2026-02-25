'use client'

import { useState } from 'react'

interface TodayTasksWidgetProps {
  tasks: any[]
  locale: string
}

export function TodayTasksWidget({ tasks, locale }: TodayTasksWidgetProps) {
  const l = locale === 'he'
  const [page, setPage] = useState(0)
  const perPage = 5
  const totalPages = Math.ceil(tasks.length / perPage)
  const current = tasks.slice(page * perPage, (page + 1) * perPage)

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{l ? 'משימות להיום' : 'Задачи сегодня'}</h3>
        <span className="text-xs text-slate-400">{tasks.length}</span>
      </div>
      
      {tasks.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">{l ? 'אין משימות' : 'Нет задач'}</p>
      ) : (
        <>
          <div className="space-y-2">
            {current.map((t: any) => (
              <div 
                key={t.id} 
                onClick={() => window.location.href = '/diary'}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  t.priority === 'high' ? 'bg-red-500' : 
                  t.priority === 'medium' ? 'bg-amber-500' : 
                  'bg-slate-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.title || '—'}</p>
                  {t.client_id && t.clients && (
                    <p className="text-xs text-slate-400">
                      {t.clients.first_name} {t.clients.last_name}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  t.priority === 'high' ? 'bg-red-500 text-white' : 
                  t.priority === 'medium' ? 'bg-amber-500 text-white' : 
                  'bg-slate-400 text-white'
                }`}>
                  {t.priority === 'high' ? (l ? 'גבוה' : 'Высок') : 
                   t.priority === 'medium' ? (l ? 'בינוני' : 'Средн') : 
                   (l ? 'נמוך' : 'Низк')}
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
    </div>
  )
}
