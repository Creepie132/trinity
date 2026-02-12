'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday, isSameDay } from 'date-fns'

interface Visit {
  id: string
  client_id: string
  service_type: string
  scheduled_at: string
  duration_minutes: number
  price: number
  status: string
  clients: {
    first_name: string
    last_name: string
  }
}

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
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }))

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 0 }),
  })

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1))
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1))
  }

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))
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

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousWeek}
          className="border-gray-200 dark:border-gray-600"
        >
          {language === 'he' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="border-gray-200 dark:border-gray-600"
          >
            {t('visits.today')}
          </Button>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {format(currentWeekStart, 'MMMM yyyy')}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToNextWeek}
          className="border-gray-200 dark:border-gray-600"
        >
          {language === 'he' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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
    </div>
  )
}
