'use client'

import { useState, useRef, useEffect } from 'react'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { CheckSquare, AlertCircle, Clock, ChevronRight, Check, X, Flame } from 'lucide-react'
import { useModalStore } from '@/store/useModalStore'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface TodayTasksWidgetProps {
  tasks: any[]
  locale: string
  orgId?: string
}

const PRIORITY_CONFIG = {
  urgent: { dot: 'bg-red-500',    bar: 'bg-red-500',    label_ru: 'Срочно',    label_he: 'דחוף'  },
  high:   { dot: 'bg-amber-500',  bar: 'bg-amber-500',  label_ru: 'Высокий',   label_he: 'גבוה'  },
  medium: { dot: 'bg-orange-400', bar: 'bg-orange-400', label_ru: 'Средний',   label_he: 'בינוני' },
  normal: { dot: 'bg-blue-500',   bar: 'bg-blue-400',   label_ru: 'Обычный',   label_he: 'רגיל'  },
  low:    { dot: 'bg-gray-400',   bar: 'bg-gray-400',   label_ru: 'Низкий',    label_he: 'נמוך'  },
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
  const wrapRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const currentX = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)
  const active = useRef(false)

  const THRESHOLD = 80

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    // Pointer Events не вызывают [Intervention] и не блокируются скроллом браузера
    function onPointerDown(e: PointerEvent) {
      if (e.pointerType === 'mouse') return
      startX.current = e.clientX
      startY.current = e.clientY
      currentX.current = 0
      isHorizontal.current = null
      active.current = true
      setIsDragging(false)
      el.setPointerCapture(e.pointerId)
    }

    function onPointerMove(e: PointerEvent) {
      if (!active.current) return
      const dx = e.clientX - startX.current
      const dy = Math.abs(e.clientY - startY.current)

      if (isHorizontal.current === null) {
        if (Math.abs(dx) > 6 || dy > 6) {
          isHorizontal.current = Math.abs(dx) > dy
        }
        return
      }

      if (!isHorizontal.current) return
      setIsDragging(true)
      currentX.current = dx
      setOffsetX(dx)
    }

    function onPointerUp() {
      if (!active.current) return
      active.current = false
      setIsDragging(false)

      if (!isHorizontal.current) { setOffsetX(0); return }

      const dx = currentX.current
      // LTR: вправо = выполнено, влево = отменить
      // RTL: влево = выполнено, вправо = отменить
      const doneDir   = isRtl ? dx < -THRESHOLD : dx >  THRESHOLD
      const cancelDir = isRtl ? dx >  THRESHOLD : dx < -THRESHOLD

      if (doneDir) {
        setDismissed(true)
        setTimeout(() => onDone(task.id), 300)
      } else if (cancelDir) {
        setDismissed(true)
        setTimeout(() => onCancel(task.id), 300)
      } else {
        setOffsetX(0)
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup',   onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup',   onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
    }
  }, [isRtl, task.id, onDone, onCancel])

  // Цвет подложки при свайпе
  // LTR: вправо = зелёный (выполнено), влево = красный (отменить)
  // RTL: влево = зелёный (выполнено), вправо = красный (отменить)
  const isDone   = (!isRtl && offsetX > 10) || (isRtl && offsetX < -10)
  const isCancel = (!isRtl && offsetX < -10) || (isRtl && offsetX > 10)
  const bgColor  = isDone ? 'bg-emerald-500' : isCancel ? 'bg-red-400' : 'transparent'

  const swipeHint = Math.abs(offsetX) > 20
    ? isDone
      ? <span className="text-white text-xs font-bold flex items-center gap-1"><Check size={14}/>{l ? 'בוצע' : 'Выполнено'}</span>
      : <span className="text-white text-xs font-bold flex items-center gap-1"><X size={14}/>{l ? 'בוטל' : 'Отменить'}</span>
    : null

  if (dismissed) return null

  // «Горит» = urgent ИЛИ просрочено (как в дневнике getBucket)
  const isUrgent = task.priority === 'urgent'
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() &&
    new Date(task.due_date).toLocaleDateString() !== new Date().toLocaleDateString()
  const isBurning = isUrgent || !!isOverdue

  return (
    <div ref={wrapRef} className={`relative overflow-hidden rounded-xl touch-pan-y select-none ${isBurning ? 'urgent-glow' : ''}`}>
      {/* Подложка */}
      <div className={`absolute inset-0 flex items-center ${isDone ? 'justify-start pl-4' : 'justify-end pr-4'} ${bgColor} transition-colors`}>
        {swipeHint}
      </div>

      {/* Карточка */}
      <div
        onClick={() => { if (Math.abs(offsetX) < 5) onClick() }}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}
        className="relative group flex items-center gap-3 p-2.5 bg-white dark:bg-gray-900 rounded-xl cursor-pointer active:scale-[0.98]"
      >
        {/* Полоса приоритета */}
        <div className={`w-1 h-8 rounded-full flex-shrink-0 ${priority.bar}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {isBurning && (
              <Flame className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            )}
            <p className={`text-sm font-medium truncate ${
              isBurning ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
            }`}>{task.title}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {task.due_date ? (
              <>
                <Clock className="w-3 h-3" />
                {new Date(task.due_date).toLocaleTimeString(l ? 'he-IL' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </>
            ) : (
              <span className={isBurning ? 'text-red-400' : ''}>
                {l ? priority.label_he : priority.label_ru}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors flex-shrink-0" />
      </div>
    </div>
  )
}

export function TodayTasksWidget({ tasks, locale, orgId }: TodayTasksWidgetProps) {
  const l = locale === 'he'
  const [page, setPage] = useState(0)
  const [localTasks, setLocalTasks] = useState(tasks)
  const perPage = 4
  const queryClient = useQueryClient()
  const { openModal } = useModalStore()

  // Sync когда tasks меняются извне (правильный паттерн)
  useEffect(() => { setLocalTasks(tasks); setPage(0) }, [tasks])

  const urgentCount = localTasks.filter(t => t.priority === 'urgent').length
  const totalPages = Math.ceil(localTasks.length / perPage)
  const current = localTasks.slice(page * perPage, (page + 1) * perPage)

  async function handleDone(id: string) {
    setLocalTasks(p => p.filter(t => t.id !== id))
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // 'completed' — единственный статус который дневник понимает как «выполнено»
        body: JSON.stringify({ status: 'completed' }),
      })
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'dashboard-tasks' })
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
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'dashboard-tasks' })
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
