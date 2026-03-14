'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft, ChevronRight, X, Plus,
  Calendar, LayoutGrid, Clock, User
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  isToday,
  isSameDay,
  isSameMonth,
} from 'date-fns'
import { Visit } from '@/types/visits'

interface CalendarViewProps {
  visits: Visit[]
  onVisitClick: (visit: any) => void
  onDateClick: (date: Date) => void
  serviceColors: Record<string, string>
}

const defaultColors: Record<string, string> = {
  haircut: '#3b82f6',
  coloring: '#a855f7',
  smoothing: '#ec4899',
  facial: '#10b981',
  manicure: '#ef4444',
  pedicure: '#f97316',
  meeting: '#6b7280',
  advertising: '#eab308',
  consultation: '#14b8a6',
  other: '#8b5cf6',
}

// Hours to display in week view
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8) // 8:00 — 22:00
const HOUR_HEIGHT = 64 // px per hour

export function CalendarView({ visits, onVisitClick, onDateClick, serviceColors }: CalendarViewProps) {
  const { t, language } = useLanguage()
  const isRTL = language === 'he'
  const isHe = language === 'he'

  const [viewMode, setViewMode] = useState<'month' | 'week'>('week')
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const weekScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const now = new Date()
    setCurrentDate(now)
    setSelectedDay(now)
  }, [])

  // Scroll week view to current time on mount
  useEffect(() => {
    if (viewMode === 'week' && weekScrollRef.current && currentDate) {
      const hour = new Date().getHours()
      const scrollTo = Math.max(0, (hour - 8) * HOUR_HEIGHT - 80)
      weekScrollRef.current.scrollTop = scrollTo
    }
  }, [viewMode, currentDate])

  if (!currentDate) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse h-[600px]" />
    )
  }

  const activeVisits = visits.filter(
    (v: any) => v.status === 'scheduled' || v.status === 'in_progress'
  )

  const getVisitsForDay = (day: Date) =>
    activeVisits
      .filter((v) => isSameDay(new Date(v.scheduled_at), day))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  const getServiceColor = (serviceType: string) =>
    serviceColors[serviceType] || defaultColors[serviceType] || defaultColors.other

  const getClientName = (visit: any): string => {
    if (visit.clients?.first_name || visit.clients?.last_name)
      return `${visit.clients.first_name || ''} ${visit.clients.last_name || ''}`.trim()
    return visit.clientName || ''
  }

  const getServiceName = (visit: any): string => {
    if (!isHe && visit.services?.name_ru) return visit.services.name_ru
    if (visit.services?.name) return visit.services.name
    return visit.service_type || ''
  }

  // ── Week dates ──────────────────────────────────────────────────────────
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // ── Month dates ─────────────────────────────────────────────────────────
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  const dayNamesShort = isRTL
    ? ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
    : ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

  const dayNamesFull = isRTL
    ? ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
    : ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

  // Selected day visits
  const selectedDayVisits = selectedDay ? getVisitsForDay(selectedDay) : []

  // Navigation
  const goBack = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1))
    else setCurrentDate(subWeeks(currentDate, 1))
  }
  const goForward = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1))
    else setCurrentDate(addWeeks(currentDate, 1))
  }
  const goToday = () => { setCurrentDate(new Date()); setSelectedDay(new Date()) }

  const headerTitle = viewMode === 'month'
    ? format(currentDate, 'MMMM yyyy')
    : `${format(weekStart, 'd MMM')} — ${format(weekEnd, 'd MMM yyyy')}`

  // ── Week view: position visit block ─────────────────────────────────────
  const getVisitTopOffset = (visit: any): number => {
    const dt = new Date(visit.scheduled_at)
    const hour = dt.getHours()
    const min = dt.getMinutes()
    return (hour - 8) * HOUR_HEIGHT + (min / 60) * HOUR_HEIGHT
  }

  const getVisitHeight = (visit: any): number => {
    // visit.duration_minutes is the authoritative value (set at booking time)
    // fall back to service default only if visit has no own duration
    const dur = visit.duration_minutes || visit.services?.duration_minutes || 30
    return Math.max((dur / 60) * HOUR_HEIGHT, 28)
  }

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="flex gap-4 items-start">

      {/* ── LEFT PANEL ───────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col gap-3 w-64 flex-shrink-0">

        {/* Mini calendar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="w-7 h-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition"
            >
              {isRTL ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="w-7 h-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition"
            >
              {isRTL ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {dayNamesShort.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-gray-400 py-0.5">{d}</div>
            ))}
          </div>

          {/* Mini grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {calDays.map((day, i) => {
              const inMonth = isSameMonth(day, currentDate)
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              const isTodayCell = isToday(day)
              const dayVisits = getVisitsForDay(day)
              return (
                <button
                  key={i}
                  onClick={() => { setSelectedDay(day); setCurrentDate(day) }}
                  className={`
                    relative h-7 w-full rounded-full text-[11px] font-medium transition-all flex items-center justify-center
                    ${!inMonth ? 'opacity-25 pointer-events-none' : ''}
                    ${isSelected ? 'bg-blue-600 text-white shadow-sm' : ''}
                    ${isTodayCell && !isSelected ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold' : ''}
                    ${inMonth && !isSelected && !isTodayCell ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300' : ''}
                  `}
                >
                  {format(day, 'd')}
                  {dayVisits.length > 0 && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected day visits list */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {selectedDay ? format(selectedDay, 'd MMMM') : ''}
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {selectedDayVisits.length}{' '}
                {isHe
                  ? 'ביקורים'
                  : selectedDayVisits.length === 1 ? 'визит' : selectedDayVisits.length < 5 ? 'визита' : 'визитов'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[340px] p-2 space-y-1.5">
            {selectedDayVisits.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <Clock size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">{isHe ? 'אין ביקורים' : 'Нет визитов'}</p>
              </div>
            ) : (
              selectedDayVisits.map((visit) => {
                const color = getServiceColor(visit.service_type)
                const clientName = getClientName(visit)
                const serviceName = getServiceName(visit)
                const time = format(new Date(visit.scheduled_at), 'HH:mm')
                const dur = visit.services?.duration_minutes || visit.duration_minutes || 0
                return (
                  <div
                    key={visit.id}
                    onClick={() => onVisitClick(visit)}
                    className="flex rounded-xl overflow-hidden cursor-pointer hover:shadow-sm transition-all border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 active:scale-[0.99]"
                  >
                    <div className="w-1 flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 px-2.5 py-2 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">{clientName || '—'}</p>
                        {(visit.price || 0) > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">₪{visit.price}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        <span className="font-bold" style={{ color }}>{time}</span>
                        {dur > 0 && <span> · {dur}{isHe ? "ד'" : 'м'}</span>}
                        {serviceName && <span> · {serviceName}</span>}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {selectedDay && (
            <div className="p-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => onDateClick(selectedDay)}
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <Plus size={13} />
                {isHe ? 'ביקור חדש' : 'Новый визит'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CALENDAR ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">

        {/* Header bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-3">

          {/* Nav left */}
          <div className="flex items-center gap-1">
            <button
              onClick={goBack}
              className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition"
            >
              {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <button
              onClick={goForward}
              className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition"
            >
              {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>

          {/* Title */}
          <h2 className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-100 flex-1 text-center">
            {headerTitle}
          </h2>

          {/* Controls right */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="h-8 px-3 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition hidden sm:block"
            >
              {isHe ? 'היום' : 'Сегодня'}
            </button>

            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => setViewMode('week')}
                className={`h-8 px-3 text-xs font-semibold transition flex items-center gap-1 ${
                  viewMode === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <LayoutGrid size={12} />
                {isHe ? 'שבוע' : 'Неделя'}
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`h-8 px-3 text-xs font-semibold transition flex items-center gap-1 border-l border-gray-200 dark:border-gray-600 ${
                  viewMode === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Calendar size={12} />
                {isHe ? 'חודש' : 'Месяц'}
              </button>
            </div>
          </div>
        </div>

        {/* ── WEEK VIEW ───────────────────────────────────────────────────── */}
        {viewMode === 'week' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">

            {/* Day header row */}
            <div className="grid border-b border-gray-100 dark:border-gray-700" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
              <div className="border-e border-gray-100 dark:border-gray-700" />
              {weekDays.map((day, i) => {
                const isTodayCell = isToday(day)
                const isSelected = selectedDay && isSameDay(day, selectedDay)
                const dayVisits = getVisitsForDay(day)
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDay(day)}
                    className={`
                      py-2 px-1 text-center cursor-pointer transition border-e border-gray-100 dark:border-gray-700 last:border-e-0
                      ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      ${!isSelected ? 'hover:bg-gray-50 dark:hover:bg-gray-700/40' : ''}
                    `}
                  >
                    <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">
                      {dayNamesShort[day.getDay()]}
                    </p>
                    <div className={`
                      mx-auto mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition
                      ${isTodayCell ? 'bg-blue-600 text-white' : ''}
                      ${isSelected && !isTodayCell ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : ''}
                      ${!isTodayCell && !isSelected ? 'text-gray-700 dark:text-gray-300' : ''}
                    `}>
                      {format(day, 'd')}
                    </div>
                    {dayVisits.length > 0 && (
                      <p className="text-[9px] text-blue-500 dark:text-blue-400 mt-0.5 font-semibold">
                        {dayVisits.length}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Time grid */}
            <div
              ref={weekScrollRef}
              className="overflow-y-auto"
              style={{ maxHeight: '560px' }}
            >
              <div className="relative" style={{ gridTemplateColumns: '52px repeat(7, 1fr)', display: 'grid', minHeight: `${HOURS.length * HOUR_HEIGHT}px` }}>

                {/* Hour labels */}
                <div className="relative border-e border-gray-100 dark:border-gray-700">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute w-full flex items-start justify-center"
                      style={{ top: (hour - 8) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    >
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-[-6px] leading-none">
                        {hour.toString().padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map((day, colIdx) => {
                  const dayVisits = getVisitsForDay(day)
                  const isTodayCol = isToday(day)
                  const isSelectedCol = selectedDay && isSameDay(day, selectedDay)

                  return (
                    <div
                      key={colIdx}
                      onClick={() => setSelectedDay(day)}
                      className={`
                        relative border-e border-gray-100 dark:border-gray-700 last:border-e-0
                        ${isTodayCol ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}
                        ${isSelectedCol && !isTodayCol ? 'bg-blue-50/20 dark:bg-blue-900/5' : ''}
                      `}
                      style={{ minHeight: `${HOURS.length * HOUR_HEIGHT}px` }}
                    >
                      {/* Click on empty time slot → create visit at that time */}
                      {HOURS.map((hour) => (
                        <div
                          key={`slot-${hour}`}
                          className="absolute w-full hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer group/slot"
                          style={{ top: (hour - 8) * HOUR_HEIGHT, height: HOUR_HEIGHT, zIndex: 1 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            const dt = new Date(day)
                            dt.setHours(hour, 0, 0, 0)
                            onDateClick(dt)
                          }}
                        >
                          <span className="absolute left-1 top-1 text-[9px] text-blue-400 opacity-0 group-hover/slot:opacity-100 transition-opacity select-none">
                            {hour.toString().padStart(2, '0')}:00
                          </span>
                        </div>
                      ))}

                      {/* Hour lines */}
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="absolute w-full border-t border-gray-100 dark:border-gray-700/60"
                          style={{ top: (hour - 8) * HOUR_HEIGHT }}
                        />
                      ))}
                      {/* Half-hour lines */}
                      {HOURS.map((hour) => (
                        <div
                          key={`h${hour}`}
                          className="absolute w-full border-t border-gray-50 dark:border-gray-700/30 border-dashed"
                          style={{ top: (hour - 8) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                        />
                      ))}

                      {/* Current time indicator */}
                      {isTodayCol && (() => {
                        const now = new Date()
                        const topPx = (now.getHours() - 8) * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT
                        if (topPx < 0 || topPx > HOURS.length * HOUR_HEIGHT) return null
                        return (
                          <div
                            className="absolute left-0 right-0 z-20 pointer-events-none"
                            style={{ top: topPx }}
                          >
                            <div className="relative flex items-center">
                              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -ms-1" />
                              <div className="flex-1 h-px bg-red-500" />
                            </div>
                          </div>
                        )
                      })()}

                      {/* Visit blocks */}
                      {dayVisits.map((visit, vi) => {
                        const color = getServiceColor(visit.service_type)
                        const top = getVisitTopOffset(visit)
                        const height = getVisitHeight(visit)
                        const clientName = getClientName(visit)
                        const time = format(new Date(visit.scheduled_at), 'HH:mm')
                        const serviceName = getServiceName(visit)
                        const isInProgress = visit.status === 'in_progress'
                        return (
                          <div
                            key={visit.id}
                            onClick={(e) => { e.stopPropagation(); onVisitClick(visit) }}
                            className="absolute left-0.5 right-0.5 rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all hover:z-30 active:scale-[0.97]"
                            style={{
                              top: top + 1,
                              height: height - 2,
                              backgroundColor: color + '22',
                              borderLeft: `3px solid ${color}`,
                              zIndex: 10 + vi,
                            }}
                          >
                            <div className="px-1.5 py-1 h-full flex flex-col justify-start overflow-hidden">
                              <p className="text-[10px] font-bold leading-tight truncate" style={{ color }}>
                                {time}
                                {isInProgress && <span className="ms-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                              </p>
                              {height > 36 && (
                                <p className="text-[10px] font-semibold leading-tight truncate text-gray-800 dark:text-gray-200">
                                  {clientName || '—'}
                                </p>
                              )}
                              {height > 52 && serviceName && (
                                <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight truncate">
                                  {serviceName}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── MONTH VIEW ──────────────────────────────────────────────────── */}
        {viewMode === 'month' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

            {/* Day name headers */}
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              {dayNamesShort.map((name, i) => (
                <div key={i} className="py-2.5 text-center text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                  {name}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 dark:divide-gray-700/60">
              {calDays.map((day, index) => {
                const dayVisits = getVisitsForDay(day)
                const isTodayCell = isToday(day)
                const isSelected = !!selectedDay && isSameDay(day, selectedDay)
                const inMonth = isSameMonth(day, currentDate)

                return (
                  <div
                    key={index}
                    onClick={() => { setSelectedDay(day); setCurrentDate(day) }}
                    className={`
                      min-h-[80px] md:min-h-[100px] p-1.5 cursor-pointer transition-colors
                      ${!inMonth ? 'opacity-25 pointer-events-none' : ''}
                      ${isTodayCell && !isSelected ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''}
                      ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      ${inMonth && !isTodayCell && !isSelected ? 'hover:bg-gray-50 dark:hover:bg-gray-700/30' : ''}
                    `}
                  >
                    <div className={`
                      text-xs font-bold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full mx-auto transition
                      ${isTodayCell ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400'}
                      ${isSelected && !isTodayCell ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : ''}
                    `}>
                      {format(day, 'd')}
                    </div>

                    <div className="space-y-0.5">
                      {dayVisits.slice(0, 3).map((visit) => {
                        const color = getServiceColor(visit.service_type)
                        const name = getClientName(visit)
                        const time = format(new Date(visit.scheduled_at), 'HH:mm')
                        const firstName = name.split(' ')[0]
                        return (
                          <div
                            key={visit.id}
                            onClick={(e) => { e.stopPropagation(); onVisitClick(visit) }}
                            className="rounded-md text-white leading-none px-1.5 py-0.5 truncate flex items-center gap-1 hover:opacity-90 transition"
                            style={{ backgroundColor: color, fontSize: '10px' }}
                          >
                            <span className="font-bold opacity-90">{time}</span>
                            {firstName && <span className="font-medium">{firstName}</span>}
                          </div>
                        )
                      })}
                      {dayVisits.length > 3 && (
                        <div className="text-[9px] text-gray-400 dark:text-gray-500 text-center font-medium">
                          +{dayVisits.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Mobile: selected day visits (below main calendar) ─────────── */}
        {selectedDay && selectedDayVisits.length > 0 && (
          <div className="lg:hidden bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                {format(selectedDay, 'd MMMM')} · {selectedDayVisits.length} {isHe ? 'ביקורים' : 'визитов'}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-3 space-y-2">
              {selectedDayVisits.map((visit) => {
                const color = getServiceColor(visit.service_type)
                const clientName = getClientName(visit)
                const time = format(new Date(visit.scheduled_at), 'HH:mm')
                return (
                  <div
                    key={visit.id}
                    onClick={() => onVisitClick(visit)}
                    className="flex rounded-xl overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-700 active:opacity-80 transition"
                  >
                    <div className="w-1 flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 px-3 py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{clientName || '—'}</p>
                        <p className="text-xs text-gray-400"><span className="font-bold" style={{ color }}>{time}</span></p>
                      </div>
                      {(visit.price || 0) > 0 && (
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₪{visit.price}</span>
                      )}
                    </div>
                  </div>
                )
              })}
              <button
                onClick={() => onDateClick(selectedDay)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
              >
                + {isHe ? 'ביקור חדש' : 'Новый визит'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
