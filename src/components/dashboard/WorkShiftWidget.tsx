'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Square, Clock, Users, Timer } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

interface WorkShift {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  display_name?: string
}

const tr = {
  he: {
    startShift: 'התחל משמרת',
    endShift: 'סיים משמרת',
    onShift: 'אתה במשמרת',
    noShift: 'אתה לא במשמרת',
    activeStaff: 'עובדים פעילים',
    noActiveStaff: 'אין עובדים במשמרת',
    started: 'התחיל',
    shiftStarted: 'המשמרת התחילה',
    shiftEnded: 'המשמרת הסתיימה',
    duration: 'משך',
  },
  ru: {
    startShift: 'Начать смену',
    endShift: 'Завершить смену',
    onShift: 'Вы на смене',
    noShift: 'Вы не на смене',
    activeStaff: 'Сотрудники на смене',
    noActiveStaff: 'Никто не на смене',
    started: 'Начал',
    shiftStarted: 'Смена началась',
    shiftEnded: 'Смена завершена',
    duration: 'Длительность',
  },
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatTime(isoString: string, locale: 'he' | 'ru'): string {
  return new Date(isoString).toLocaleTimeString(
    locale === 'he' ? 'he-IL' : 'ru-RU',
    { hour: '2-digit', minute: '2-digit' }
  )
}

export function WorkShiftWidget() {
  const { role } = useAuth()
  const { language } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'
  const t = tr[locale]
  const isOwner = role === 'owner'

  const [myShift, setMyShift] = useState<WorkShift | null>(null)
  const [activeShifts, setActiveShifts] = useState<WorkShift[]>([])
  const [hasStaff, setHasStaff] = useState<boolean | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/work-shifts')
      if (!res.ok) return
      const data = await res.json()
      setMyShift(data.myShift)
      setActiveShifts(data.activeShifts || [])
      if (typeof data.hasStaff === 'boolean') setHasStaff(data.hasStaff)
    } catch {}
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [load])

  // Live timer for my active shift
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!myShift) { setElapsed(0); return }

    const update = () => {
      const diff = Math.floor((Date.now() - new Date(myShift.started_at).getTime()) / 1000)
      setElapsed(diff)
    }
    update()
    timerRef.current = setInterval(update, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [myShift?.id, myShift?.started_at])

  async function startShift() {
    setLoading(true)
    try {
      const res = await fetch('/api/work-shifts', { method: 'POST' })
      if (!res.ok) {
        const e = await res.json()
        toast.error(e.error)
        return
      }
      const shift = await res.json()
      setMyShift(shift)
      toast.success(t.shiftStarted)
    } catch {
      toast.error('Error')
    } finally {
      setLoading(false)
    }
  }

  async function endShift() {
    if (!myShift) return
    setLoading(true)
    try {
      const res = await fetch('/api/work-shifts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: myShift.id }),
      })
      if (!res.ok) {
        const e = await res.json()
        toast.error(e.error)
        return
      }
      setMyShift(null)
      setElapsed(0)
      toast.success(t.shiftEnded)
      if (isOwner) load()
    } catch {
      toast.error('Error')
    } finally {
      setLoading(false)
    }
  }

  // Owner view: who is on shift
  if (isOwner) {
    // Hide while loading OR if no staff members exist
    if (hasStaff === null || hasStaff === false) return null
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{t.activeStaff}</h3>
          {activeShifts.length > 0 && (
            <span className="ms-auto text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
              {activeShifts.length}
            </span>
          )}
        </div>

        {activeShifts.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-3">{t.noActiveStaff}</p>
        ) : (
          <div className="space-y-2">
            {activeShifts.map((shift) => (
              <div key={shift.id} className="flex items-center gap-3 bg-green-50 dark:bg-green-900/10 rounded-xl px-3 py-2">
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {shift.display_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t.started}: {formatTime(shift.started_at, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <Timer className="w-3 h-3" />
                  {formatDuration(Math.floor((Date.now() - new Date(shift.started_at).getTime()) / 1000))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Staff view: shift button + timer
  return (
    <div className={`rounded-2xl border p-4 transition-all ${
      myShift
        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-700'
        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
    }`}>
      {myShift ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-400">{t.onShift}</span>
            <span className="ms-auto text-xs text-gray-500 dark:text-gray-400">
              {formatTime(myShift.started_at, locale)}
            </span>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 py-1">
            <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-2xl font-bold font-mono text-green-700 dark:text-green-300 tabular-nums">
              {formatDuration(elapsed)}
            </span>
          </div>

          <button
            onClick={endShift}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors active:scale-[0.98] text-sm"
          >
            <Square className="w-4 h-4 fill-current" />
            {t.endShift}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.noShift}</span>
          </div>

          <button
            onClick={startShift}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors active:scale-[0.98] text-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            {t.startShift}
          </button>
        </div>
      )}
    </div>
  )
}
