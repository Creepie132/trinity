'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, isSameDay, getDay, startOfWeek, endOfWeek } from 'date-fns'
import { Visit } from '@/types/visits'

interface CalendarViewProps {
  visits: Visit[]
  onVisitClick: (visit: Visit) => void
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
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Фильтр: показывать только активные визиты (scheduled и in_progress)
  const activeVisits = visits.filter((v: any) => v.status === 'scheduled' || v.status === 'in_progress')

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  
  // Get calendar days including leading/trailing days from prev/next months
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
    setSelectedDay(null)
  }

  const getVisitsForDay = (day: Date) => {
    return activeVisits.filter(visit => {
      const visitDate = new Date(visit.scheduled_at)
      return isSameDay(visitDate, day)
    }).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  }

  const getServiceColor = (serviceType: string) => {
    return serviceColors[serviceType] || defaultColors[serviceType] || defaultColors.other
  }

  const getServiceLabel = (serviceType: string): string => {
    const serviceMap: Record<string, string> = {
      haircut: t('service.haircut'),
      coloring: t('service.coloring'),
      smoothing: t('service.smoothing'),
      facial: t('service.facial'),
      manicure: t('service.manicure'),
      pedicure: t('service.pedicure'),
      haircutColoring: t('service.haircutColoring'),
      hairTreatment: t('service.hairTreatment'),
      consultation: t('service.consultation'),
      meeting: t('service.meeting'),
      advertising: t('service.advertising'),
      other: t('service.other'),
    }
    return serviceMap[serviceType] || serviceType
  }

  const dayNames = language === 'he' 
    ? ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
    : ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

  const handleDayClick = (day: Date) => {
    setSelectedDay(day)
    const dayVisits = getVisitsForDay(day)
    if (dayVisits.length === 0) {
      onDateClick(day)
    }
  }

  const selectedDayVisits = selectedDay ? getVisitsForDay(selectedDay) : []
  const isCurrentMonth = (day: Date) => day.getMonth() === currentMonth.getMonth()

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousMonth}
          className="border-gray-200 dark:border-gray-600 h-9 px-3"
        >
          {language === 'he' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>

        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="border-gray-200 dark:border-gray-600 h-9 text-xs md:text-sm"
          >
            {t('visits.today')}
          </Button>
          <span className="text-sm md:text-lg font-semibold text-gray-900 dark:text-gray-100">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToNextMonth}
          className="border-gray-200 dark:border-gray-600 h-9 px-3"
        >
          {language === 'he' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>

      {/* Monthly Calendar Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {(language === 'he' ? [...dayNames].reverse() : dayNames).map((dayName, index) => (
            <div
              key={index}
              className="p-2 md:p-3 text-center text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700 first:border-l-0"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7">
          {(language === 'he' ? [...calendarDays].reverse() : calendarDays).map((day, index) => {
            const dayVisits = getVisitsForDay(day)
            const isTodayCell = isToday(day)
            const isSelected = selectedDay && isSameDay(day, selectedDay)
            const inCurrentMonth = isCurrentMonth(day)

            return (
              <div
                key={index}
                className={`
                  min-h-[80px] md:min-h-[100px] p-1 md:p-2
                  border-l border-b border-gray-200 dark:border-gray-700
                  first:border-l-0
                  cursor-pointer transition-colors
                  ${isTodayCell ? 'bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-500' : ''}
                  ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                  ${!inCurrentMonth ? 'bg-gray-50 dark:bg-gray-900/50 opacity-50' : ''}
                  ${inCurrentMonth && !isTodayCell && !isSelected ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : ''}
                `}
                onClick={() => handleDayClick(day)}
              >
                {/* Day number */}
                <div className={`
                  text-xs md:text-sm font-semibold mb-1
                  ${isTodayCell ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}
                  ${!inCurrentMonth ? 'text-gray-400 dark:text-gray-600' : ''}
                `}>
                  {format(day, 'd')}
                </div>

                {/* Visit indicators */}
                {dayVisits.length > 0 && (
                  <div className="space-y-0.5">
                    {dayVisits.slice(0, 2).map((visit) => (
                      <div
                        key={visit.id}
                        className="h-1.5 md:h-2 rounded-full"
                        style={{ backgroundColor: getServiceColor(visit.service_type) }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onVisitClick(visit)
                        }}
                      />
                    ))}
                    {dayVisits.length > 2 && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                        +{dayVisits.length - 2}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day visits */}
      {selectedDay && selectedDayVisits.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {format(selectedDay, 'dd MMMM yyyy')}
          </h3>
          <div className="space-y-2">
            {selectedDayVisits.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => onVisitClick(visit)}
              >
                <div
                  className="w-1 h-12 rounded-full"
                  style={{ backgroundColor: getServiceColor(visit.service_type) }}
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {format(new Date(visit.scheduled_at), 'HH:mm')} - {visit.clients?.first_name} {visit.clients?.last_name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {getServiceLabel(visit.service_type)} • {visit.duration_minutes || 0} דק׳ • ₪{visit.price || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
