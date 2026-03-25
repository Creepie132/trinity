'use client'

import { useState, useRef } from 'react'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { CheckSquare, AlertCircle, Clock, ChevronRight, Check, X } from 'lucide-react'
import { useModalStore } from '@/store/useModalStore'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

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

interface SwipeableTaskProps {
  task: any
  locale: string
  onDone: (id: string) => void
  onCancel: (id: string) => void
  onClick: () => void
}

function SwipeableTask({ task, locale, onDone, onCancel, onClick }: SwipeableTaskProps) {
  const l = locale === 'he'
  const isRtl = l
  const priority = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.normal

  const [offsetX, setOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)

  const THRESHOLD = 80

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontal.current = null
    setIsDragging(true)
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startX.current
    const dy = Math.abs(e.touches[0].clientY - startY.current)

    // Определяем направление на первых движениях
    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 5 || dy > 5) {
        isHorizontal.current = Math.abs(dx) > dy
      }
      return
    }

    if (!isHorizontal.current) return // вертикальный скролл — не трогаем
    e.preventDefault()
    setOffsetX(dx)
  }

  function handleTouchEnd() {
    setIsDragging(false)
    if (!isHorizontal.current) { setOffsetX(0); return }

    const dx = offsetX
    // LTR: влево = выполнено, вправо = отменить
    // RTL: вправо = выполнено, влево = отменить
    const doneDirection  = isRtl ? dx >  THRESHOLD : dx < -THRESHOLD
    const cancelDirection = isRtl ? dx < -THRESHOLD : dx >  THRESHOLD

    if (doneDirection) {
      setDismissed(true)
      setTimeout(() => onDone(task.id), 300)
    } else if (cancelDirection) {
      setDismissed(true)
      setTimeout(() => onCancel(task.id), 300)
    } else {
      setOffsetX(0)
    }
  }

  // Цвет подложки при свайпе
  const bgColor = offsetX < -10 || (isRtl && offsetX > 10)
    ? 'bg-emerald-500' // выполнено — зелёный
    : offsetX > 10 || (isRtl && offsetX < -10)
    ? 'bg-red-400'    // отменить — красный
    : 'transparent'

  const swipeHint = Math.abs(offsetX) > 20
    ? (offsetX < 0 && !isRtl) || (offsetX > 0 && isRtl)
      ? <span className="text-white text-xs font-bold flex items-center gap-1"><Check size={14}/>{l ? 'בוצע' : 'Выполнено'}</span>
      : <span className="text-white text-xs font-bold flex items-center gap-1"><X size={14}/>{l ? 'בוטל' : 'Отменить'}</span>
    : null

  if (dismissed) return null

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Подложка */}
      <div className={`absolute inset-0 flex items-center ${offsetX < 0 || (isRtl && offsetX > 0) ? 'justify-end pr-4' : 'justify-start pl-4'} ${bgColor} transition-colors`}>
        {swipeHint}
      </div>

      {/* Карточка */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (Math.abs(offsetX) < 5) onClick() }}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}
        className="relative group flex items-center gap-3 p-2.5 bg-white dark:bg-gray-900 rounded-xl cursor-pointer active:scale-[0.98]"
      >
        <div className={`w-1 h-8 rounded-full flex-shrink-0 ${priority.bar}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</p>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {task.due_date ? (
              <>
                <Clock className="w-3 h-3" />
                {new Date(task.due_date).toLocaleTimeString(l ? 'he-IL' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </>
            ) : (
              <span>{l ? priority.label_he : priority.label_ru}</span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors flex-shrink-0" />
      </div>
    </div>
  )
}

export function TodayTasksWidget({ tasks, locale }: TodayTasksWidgetProps) {
  const l = locale === 'he'
  const [page, setPage] = useState(0)
  const [localTasks, setLocalTasks] = useState(tasks)
  const perPage = 4
  const queryClient = useQueryClient()
  const { openModal } = useModalStore()

  // Sync когда tasks меняются извне
  useState(() => { setLocalTasks(tasks) })

  const urgentCount = localTasks.filter(t => t.priority === 'urgent').length
  const totalPages = Math.ceil(localTasks.length / perPage)
  const current = localTasks.slice(page * perPage, (page + 1) * perPage)

  async function handleDone(id: string) {
    setLocalTasks(p => p.filter(t => t.id !== id))
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] })
      toast.success(l ? 'משימה הושלמה ✓' : 'Задача выполнена ✓')
    } catch {
      toast.error(l ? 'שגיאה' : 'Ошибка')
    }
  }

  async function handleCancel(id: string) {
    setLocalTasks(p => p.filter(t => t.id !== id))
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] })
      toast.success(l ? 'משימה בוטלה' : 'Задача отменена')
    } catch {
      toast.error(l ? 'שגיאה' : 'Ошибка')
    }
  }

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
            {localTasks.length > 0 && (
              <p className="text-xs text-gray-400">
                {l ? 'החלק לסיום/ביטול' : 'Свайп для выполнения/отмены'}
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
            {localTasks.length}
          </span>
        </div>
      </div>

      {localTasks.length === 0 ? (
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
            {current.map((t: any) => (
              <SwipeableTask
                key={t.id}
                task={t}
                locale={locale}
                onDone={handleDone}
                onCancel={handleCancel}
                onClick={() => openModal('task-details', { task: t, locale })}
              />
            ))}
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
