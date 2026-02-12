'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Clock, Calendar } from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, addDays, subDays, isToday, isSameDay } from 'date-fns'
import { Visit } from '@/types/visits'

interface CalendarViewProps {
  visits: Visit[]
  onVisitClick: (visit: Visit) => void
  onDateClick: (date: Date) => void
  serviceColors: Record<string, string>
}

const defaultColors: Record<string, string> = {
  haircut: '#3b82f6',      // blue
  coloring: '#a855f7',     // purple
  smoothing: '#ec4899',    // pink
  facial: '#10b981',       // green
  manicure: '#ef4444',     // red
  pedicure: '#f97316',     // orange
  meeting: '#6b7280',      // gray
  advertising: '#eab308',  // yellow
  consultation: '#14b8a6', // teal
  other: '#8b5cf6',        // violet
}

export function CalendarView({ visits, onVisitClick, onDateClick, serviceColors }: CalendarViewProps) {
  const { t, language } = useLanguage()
  const [isMobile, setIsMobile] = useState(false)
  
  // Desktop: week view, Mobile: single day view
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [currentDay, setCurrentDay] = useState(new Date())

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 0 }),
  })

  // Desktop navigation
  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1))
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1))
  }

  // Mobile navigation
  const goToPreviousDay = () => {
    setCurrentDay(subDays(currentDay, 1))
  }

  const goToNextDay = () => {
    setCurrentDay(addDays(currentDay, 1))
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 0 }))
    setCurrentDay(today)
  }

  const getVisitsForDay = (day: Date) => {
    return visits.filter(visit => {
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

  const dayVisits = isMobile ? getVisitsForDay(currentDay) : []

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          size="sm"
          onClick={isMobile ? goToPreviousDay : goToPreviousWeek}
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
            {isMobile 
              ? format(currentDay, 'dd/MM/yyyy')
              : format(currentWeekStart, 'MMMM yyyy')
            }
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={isMobile ? goToNextDay : goToNextWeek}
          className="border-gray-200 dark:border-gray-600 h-9 px-3"
        >
          {language === 'he' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>

      {/* Desktop: Weekly Calendar Grid */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {(language === 'he' ? [...dayNames].reverse() : dayNames).map((dayName, index) => (
            <div
              key={index}
              className="p-3 text-center font-semibold text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700 first:border-l-0"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {(language === 'he' ? [...weekDays].reverse() : weekDays).map((day, index) => {
            const dayVisits = getVisitsForDay(day)
            const isTodayCell = isToday(day)

            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border-l border-b border-gray-200 dark:border-gray-700 first:border-l-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  isTodayCell ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onClick={() => onDateClick(day)}
              >
                <div className={`text-sm font-semibold mb-2 ${
                  isTodayCell ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {format(day, 'd')}
                </div>

                <div className="space-y-1">
                  {dayVisits.map((visit) => (
                    <div
                      key={visit.id}
                      className="p-2 rounded text-xs text-white cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: getServiceColor(visit.service_type) }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onVisitClick(visit)
                      }}
                    >
                      <div className="font-semibold">{format(new Date(visit.scheduled_at), 'HH:mm')}</div>
                      <div className="truncate">{visit.clients.first_name} {visit.clients.last_name}</div>
                      <div className="truncate opacity-90">{getServiceLabel(visit.service_type)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile: Single Day with Vertical Cards */}
      <div className="md:hidden space-y-3">
        {dayVisits.length > 0 ? (
          dayVisits.map((visit) => (
            <div
              key={visit.id}
              className="bg-white dark:bg-gray-800 rounded-lg border-r-4 border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
              style={{ borderRightColor: getServiceColor(visit.service_type) }}
              onClick={() => onVisitClick(visit)}
            >
              {/* Time */}
              <div className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                <Clock className="w-5 h-5" style={{ color: getServiceColor(visit.service_type) }} />
                {format(new Date(visit.scheduled_at), 'HH:mm')}
              </div>

              {/* Client Name */}
              <div className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {visit.clients.first_name} {visit.clients.last_name}
              </div>

              {/* Service */}
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getServiceColor(visit.service_type) }}
                />
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {getServiceLabel(visit.service_type)}
                </span>
              </div>

              {/* Duration & Price */}
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{visit.duration_minutes} דק׳</span>
                <span className="text-2xl font-bold" style={{ color: getServiceColor(visit.service_type) }}>
                  ₪{visit.price}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div 
            className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => onDateClick(currentDay)}
          >
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400">{t('visits.noVisits')}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {t('visits.tapToAdd')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
