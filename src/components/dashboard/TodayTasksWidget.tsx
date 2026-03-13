'use client'

import { useState } from 'react'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { CheckSquare, AlertCircle, Clock, ChevronRight } from 'lucide-react'
import { useModalStore } from '@/store/useModalStore'

interface TodayTasksWidgetProps {
  tasks: any[]
  locale: string
}

const PRIORITY_CONFIG = {
  urgent: { dot: 'bg-red-500', bar: 'bg-red-500', label_ru: 'Срочно', label_he: 'דחוף' },
  high:   { dot: 'bg-amber-500', bar: 'bg-amber-500', label_ru: 'Высокий', label_he: 'גבוה' },
  normal: { dot: 'bg-blue-500', bar: 'bg-blue-400', label_ru: 'Обычный', label_he: 'רגיל' },
  low:    { dot: 'bg-gray-400', bar: 'bg-gray-400', label_ru: 'Низкий', label_he: 'נמוך' },
}

export function TodayTasksWidget({ tasks, locale }: TodayTasksWidgetProps) {
  const l = locale === 'he'
  const [page, setPage] = useState(0)
  const perPage = 4
  const totalPages = Math.ceil(tasks.length / perPage)
  const current = tasks.slice(page * perPage, (page + 1) * perPage)
  const { openModal } = useModalStore()

  const urgentCount = tasks.filter(t => t.priority === 'urgent').length

  return (
    <WidgetCard className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <CheckSquare className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {l ? 'משימות היום' : 'Задачи сегодня'}
            </h3>
            {tasks.length > 0 && (
              <p className="text-xs text-gray-400">
                {tasks.length} {l ? 'פתוחות' : 'открытых'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" />
              {urgentCount}
            </span>
          )}
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center">
            {tasks.length}
          </span>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
            <CheckSquare className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">{l ? 'אין משימות להיום' : 'Задач на сегодня нет'}</p>
          <p className="text-xs text-emerald-500 font-medium">{l ? '✓ הכל נקי' : '✓ Всё чисто'}</p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {current.map((t: any) => {
              const priority = PRIORITY_CONFIG[t.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.normal
              return (
                <div
                  key={t.id}
                  onClick={() => openModal('task-details', { task: t, locale })}
                  className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-all duration-150 active:scale-[0.98]"
                >
                  {/* Priority bar */}
                  <div className={`w-1 h-8 rounded-full flex-shrink-0 ${priority.bar}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t.title}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      {t.due_date ? (
                        <>
                          <Clock className="w-3 h-3" />
                          {new Date(t.due_date).toLocaleTimeString(l ? 'he-IL' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </>
                      ) : (
                        <span>{l ? priority.label_he : priority.label_ru}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className={`h-1.5 rounded-full transition-all duration-200 ${page === i ? 'bg-purple-500 w-5' : 'bg-gray-200 w-1.5'}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </WidgetCard>
  )
}
