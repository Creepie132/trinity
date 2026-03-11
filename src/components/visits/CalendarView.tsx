'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isToday,
  isSameDay,
  startOfWeek,
  endOfWeek,
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

export function CalendarView({ visits, onVisitClick, onDateClick, serviceColors }: CalendarViewProps) {
  const { t, language } = useLanguage()
  const isRTL = language === 'he'

  const [currentMonth, setCurrentMonth] = useState<Date | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  useEffect(() => {
    setCurrentMonth(new Date())
  }, [])

  if (!currentMonth) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mb-4" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const activeVisits = visits.filter(
    (v: any) => v.status === 'scheduled' || v.status === 'in_progress'
  )

  const calendarStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getVisitsForDay = (day: Date) =>
    activeVisits
      .filter((v) => isSameDay(new Date(v.scheduled_at), day))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  const getServiceColor = (serviceType: string) =>
    serviceColors[serviceType] || defaultColors[serviceType] || defaultColors.other

  const getClientName = (visit: any): string => {
    if (visit.clients?.first_name || visit.clients?.last_name) {
      return `${visit.clients.first_name || ''} ${visit.clients.last_name || ''}`.trim()
    }
    return visit.clientName || ''
  }

  const getServiceName = (visit: any): string => {
    if (language !== 'he' && visit.services?.name_ru) return visit.services.name_ru
    if (visit.services?.name) return visit.services.name
    return visit.service_type || ''
  }

  const dayNames = isRTL
    ? ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
    : ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

  const displayedDays = isRTL ? [...calendarDays].reverse() : calendarDays
  const displayedDayNames = isRTL ? [...dayNames].reverse() : dayNames

  const handleDayClick = (day: Date) => {
    const dayVisits = getVisitsForDay(day)
    if (dayVisits.length > 0) {
      setSelectedDay(selectedDay && isSameDay(day, selectedDay) ? null : day)
    } else {
      setSelectedDay(null)
      onDateClick(day)
    }
  }

  const selectedDayVisits = selectedDay ? getVisitsForDay(selectedDay) : []
  const isInCurrentMonth = (day: Date) => day.getMonth() === currentMonth.getMonth()

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-3">

      {/* Navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
        <Button
          variant="outline" size="sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="h-9 w-9 p-0"
        >
          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => { setCurrentMonth(new Date()); setSelectedDay(null) }}
            className="h-8 text-xs px-3"
          >
            {t('visits.today')}
          </Button>
          <span className="text-sm md:text-base font-semibold min-w-[130px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
        </div>

        <Button
          variant="outline" size="sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="h-9 w-9 p-0"
        >
          {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>

      {/* Calendar + Side panel */}
      <div className={`flex gap-4 items-start ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>

        {/* Calendar grid */}
        <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

          {/* Day name headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
            {displayedDayNames.map((name, i) => (
              <div key={i} className="py-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                {name}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 dark:divide-gray-700">
            {displayedDays.map((day, index) => {
              const dayVisits = getVisitsForDay(day)
              const isTodayCell = isToday(day)
              const isSelected = !!selectedDay && isSameDay(day, selectedDay)
              const inMonth = isInCurrentMonth(day)

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={`
                    min-h-[70px] md:min-h-[88px] p-1 cursor-pointer transition-colors
                    ${!inMonth ? 'opacity-30 pointer-events-none' : ''}
                    ${isTodayCell && !isSelected ? 'bg-amber-50 dark:bg-amber-900/10' : ''}
                    ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    ${inMonth && !isTodayCell && !isSelected ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}
                  `}
                >
                  {/* Day number */}
                  <div className={`
                    text-[11px] font-bold mb-1 w-5 h-5 flex items-center justify-center rounded-full mx-auto
                    ${isTodayCell ? 'bg-amber-500 text-white' : 'text-gray-600 dark:text-gray-400'}
                    ${isSelected && !isTodayCell ? 'bg-blue-500 text-white' : ''}
                  `}>
                    {format(day, 'd')}
                  </div>

                  {/* Visit event blocks */}
                  <div className="space-y-0.5">
                    {dayVisits.slice(0, 3).map((visit) => {
                      const color = getServiceColor(visit.service_type)
                      const name = getClientName(visit)
                      const time = format(new Date(visit.scheduled_at), 'HH:mm')
                      const firstName = name.split(' ')[0]

                      return (
                        <div
                          key={visit.id}
                          className="rounded text-white leading-none px-1 py-0.5 truncate"
                          style={{ backgroundColor: color, fontSize: '10px' }}
                          title={`${time} ${name}`}
                          onClick={(e) => { e.stopPropagation(); handleDayClick(day) }}
                        >
                          <span className="font-semibold">{time}</span>
                          {firstName && <span className="ms-1 font-medium">{firstName}</span>}
                        </div>
                      )
                    })}
                    {dayVisits.length > 3 && (
                      <div className="text-[9px] text-gray-400 text-center leading-none">
                        +{dayVisits.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Side panel — desktop only */}
        {selectedDay && (
          <div className="hidden md:flex flex-col w-72 lg:w-80 flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[560px]">

            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedDayVisits.length}{' '}
                  {language === 'he' ? 'ביקורים' : selectedDayVisits.length === 1 ? 'визит' : selectedDayVisits.length < 5 ? 'визита' : 'визитов'}
                </p>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  {format(selectedDay, 'd MMMM yyyy')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center transition"
              >
                <X size={14} />
              </button>
            </div>

            {/* Visit cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {selectedDayVisits.map((visit) => {
                const color = getServiceColor(visit.service_type)
                const clientName = getClientName(visit)
                const serviceName = getServiceName(visit)
                const time = format(new Date(visit.scheduled_at), 'HH:mm')

                return (
                  <div
                    key={visit.id}
                    className="flex rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800"
                    onClick={() => onVisitClick(visit)}
                  >
                    {/* Colored stripe */}
                    <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: color }} />

                    <div className="flex-1 px-3 py-2.5 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate leading-tight">
                          {clientName || '—'}
                        </p>
                        {(visit.price || 0) > 0 && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0 ms-1">
                            ₪{visit.price}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs font-bold" style={{ color }}>{time}</span>
                        {serviceName && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">· {serviceName}</span>
                        )}
                      </div>

                      {(visit.duration_minutes || 0) > 0 && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {visit.duration_minutes} {language === 'he' ? 'דק׳' : 'мин'}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add visit button */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => onDateClick(selectedDay)}
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
              >
                + {language === 'he' ? 'ביקור חדש' : 'Новый визит'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: selected day panel below calendar */}
      {selectedDay && selectedDayVisits.length > 0 && (
        <div className="md:hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              {format(selectedDay, 'd MMMM')}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600 transition">
              <X size={16} />
            </button>
          </div>

          <div className="p-3 space-y-2">
            {selectedDayVisits.map((visit) => {
              const color = getServiceColor(visit.service_type)
              const clientName = getClientName(visit)
              const serviceName = getServiceName(visit)
              const time = format(new Date(visit.scheduled_at), 'HH:mm')

              return (
                <div
                  key={visit.id}
                  className="flex rounded-xl overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 active:opacity-80 transition"
                  onClick={() => onVisitClick(visit)}
                >
                  <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 px-3 py-2.5 flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{clientName || '—'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        <span className="font-semibold" style={{ color }}>{time}</span>
                        {serviceName ? ` · ${serviceName}` : ''}
                      </p>
                    </div>
                    {(visit.price || 0) > 0 && (
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">₪{visit.price}</span>
                    )}
                  </div>
                </div>
              )
            })}

            <button
              onClick={() => onDateClick(selectedDay)}
              className="w-full mt-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
            >
              + {language === 'he' ? 'ביקור חדש' : 'Новый визит'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
