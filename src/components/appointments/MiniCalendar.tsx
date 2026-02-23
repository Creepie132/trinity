'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths, 
  isSameMonth, 
  isSameDay 
} from 'date-fns'
import { he, ru, enUS } from 'date-fns/locale'
import { Button } from '@/components/ui/button'

type Locale = 'he' | 'ru' | 'en'

const localeMap = {
  he,
  ru,
  en: enUS
}

interface MiniCalendarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  locale?: Locale
}

export function MiniCalendar({ 
  selectedDate, 
  onDateSelect, 
  locale = 'en' 
}: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate)
  const dateLocale = localeMap[locale]
  const isRTL = locale === 'he'

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const dateRows = []
  let days = []
  let day = startDate

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      days.push(day)
      day = addDays(day, 1)
    }
    dateRows.push(days)
    days = []
  }

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), i)
    return format(date, 'EEEEEE', { locale: dateLocale })
  })

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="bg-white rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={previousMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h3 className="text-sm font-semibold text-slate-900">
          {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
        </h3>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={nextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, i) => (
          <div
            key={i}
            className="text-center text-xs font-medium text-slate-500 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Date Grid */}
      <div className="space-y-1">
        {dateRows.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day, dayIndex) => {
              const isSelected = isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())
              const isCurrentMonth = isSameMonth(day, currentMonth)

              return (
                <button
                  key={dayIndex}
                  onClick={() => onDateSelect(day)}
                  className={`
                    h-8 w-full rounded-md text-sm transition-colors
                    ${isSelected 
                      ? 'bg-blue-600 text-white font-semibold' 
                      : isToday
                        ? 'bg-blue-100 text-blue-600 font-semibold'
                        : isCurrentMonth
                          ? 'text-slate-900 hover:bg-slate-100'
                          : 'text-slate-400 hover:bg-slate-50'
                    }
                  `}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Upcoming Events Section */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">
          Upcoming events
        </h4>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
            <div>
              <div className="font-medium text-slate-900">Team Meeting</div>
              <div className="text-slate-500">Today, 2:00 PM</div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-1.5" />
            <div>
              <div className="font-medium text-slate-900">Surgery</div>
              <div className="text-slate-500">Tomorrow, 10:00 AM</div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5" />
            <div>
              <div className="font-medium text-slate-900">Consultation</div>
              <div className="text-slate-500">May 16, 3:30 PM</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
