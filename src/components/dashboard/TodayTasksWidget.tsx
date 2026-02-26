'use client'

import { useState } from 'react'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { useModalStore } from '@/store/useModalStore'

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
  const { openModal } = useModalStore()

  return (
    <WidgetCard className="p-4">
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
                onClick={() => openModal('task-details', { task: t, locale })}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  t.priority === 'urgent' ? 'bg-red-500' : 
                  t.priority === 'high' ? 'bg-amber-500' : 
                  'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  {t.due_date && (
                    <p className="text-xs text-slate-400">
                      {new Date(t.due_date).toLocaleTimeString(l ? 'he-IL' : 'ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  )}
                </div>
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
