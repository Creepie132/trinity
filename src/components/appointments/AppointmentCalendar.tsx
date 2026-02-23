'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns'
import { he, ru, enUS } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MiniCalendar } from './MiniCalendar'

type Locale = 'he' | 'ru' | 'en'

interface Appointment {
  id: string
  clientName: string
  service: string
  startTime: string
  endTime: string
  date: Date
  type: 'consultation' | 'surgery' | 'meeting' | 'checkup'
}

const mockAppointments: Appointment[] = [
  {
    id: '1',
    clientName: 'Louis Park',
    service: 'Survey',
    startTime: '9:00',
    endTime: '11:30',
    date: new Date(2026, 4, 10),
    type: 'consultation'
  },
  {
    id: '2',
    clientName: 'Emma Johnson',
    service: 'Nurse meeting',
    startTime: '14:00',
    endTime: '15:30',
    date: new Date(2026, 4, 10),
    type: 'meeting'
  },
  {
    id: '3',
    clientName: 'Sarah Mitchell',
    service: 'Surgery',
    startTime: '11:00',
    endTime: '13:00',
    date: new Date(2026, 4, 12),
    type: 'surgery'
  },
  {
    id: '4',
    clientName: 'Louis Park',
    service: 'Nurse',
    startTime: '10:00',
    endTime: '12:30',
    date: new Date(2026, 4, 14),
    type: 'checkup'
  },
  {
    id: '5',
    clientName: 'Jenny Green',
    service: 'Other meeting',
    startTime: '10:30',
    endTime: '14:00',
    date: new Date(2026, 4, 14),
    type: 'meeting'
  },
  {
    id: '6',
    clientName: 'Fred Sanchez',
    service: 'Survey',
    startTime: '11:00',
    endTime: '12:00',
    date: new Date(2026, 4, 14),
    type: 'consultation'
  },
  {
    id: '7',
    clientName: 'Anika Hughes',
    service: 'Consultation',
    startTime: '9:00',
    endTime: '10:30',
    date: new Date(2026, 4, 15),
    type: 'consultation'
  },
  {
    id: '8',
    clientName: 'Martha Pilgrim',
    service: 'Dermatology',
    startTime: '12:00',
    endTime: '13:30',
    date: new Date(2026, 4, 15),
    type: 'checkup'
  },
  {
    id: '9',
    clientName: 'Casey Smith',
    service: 'Surgery',
    startTime: '13:00',
    endTime: '15:00',
    date: new Date(2026, 4, 15),
    type: 'surgery'
  }
]

const typeColors = {
  consultation: {
    bg: 'bg-blue-100',
    border: 'border-l-4 border-blue-400',
    text: 'text-blue-900'
  },
  surgery: {
    bg: 'bg-pink-100',
    border: 'border-l-4 border-pink-400',
    text: 'text-pink-900'
  },
  meeting: {
    bg: 'bg-green-100',
    border: 'border-l-4 border-green-400',
    text: 'text-green-900'
  },
  checkup: {
    bg: 'bg-orange-100',
    border: 'border-l-4 border-orange-400',
    text: 'text-orange-900'
  }
}

const timeSlots = [
  '9:00', '9:30', '10:00', '10:30', '11:00', '11:30', 
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
]

const localeMap = {
  he,
  ru,
  en: enUS
}

export function AppointmentCalendar({ locale = 'en' as Locale }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 0 })
  )
  const [showMiniCalendar, setShowMiniCalendar] = useState(false)
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  
  const isRTL = locale === 'he'
  const dateLocale = localeMap[locale]

  const weekDays = Array.from({ length: 7 }, (_, i) => 
    addDays(currentWeekStart, i)
  )

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))
  }

  const previousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1))
  }

  const nextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1))
  }

  const getAppointmentsForDayAndTime = (day: Date, time: string) => {
    return mockAppointments.filter(apt => 
      isSameDay(apt.date, day) && apt.startTime === time
    )
  }

  const calculateRowSpan = (startTime: string, endTime: string) => {
    const startIndex = timeSlots.indexOf(startTime)
    const endIndex = timeSlots.indexOf(endTime)
    return endIndex - startIndex
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="h-full w-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">Appointments</h1>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={goToToday}
              className="text-sm"
            >
              Today
            </Button>
            
            <div className="flex items-center border border-slate-200 rounded-md">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={previousWeek}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-4 text-sm font-medium"
                onClick={() => setShowMiniCalendar(!showMiniCalendar)}
              >
                {format(currentWeekStart, 'MMMM yyyy', { locale: dateLocale })}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={nextWeek}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center border border-slate-200 rounded-md p-1">
            <button
              className={`px-4 py-1.5 text-sm rounded ${
                viewMode === 'week' 
                  ? 'bg-slate-900 text-white' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button
              className={`px-4 py-1.5 text-sm rounded ${
                viewMode === 'day' 
                  ? 'bg-slate-900 text-white' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Calendar Grid */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-[800px]">
            {/* Days Header */}
            <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-100 bg-white sticky top-0 z-10">
              <div className="p-4" />
              {weekDays.map((day) => (
                <div
                  key={day.toString()}
                  className="p-4 text-center border-l border-slate-100"
                >
                  <div className="text-xs text-slate-500 uppercase">
                    {format(day, 'EEE', { locale: dateLocale })}
                  </div>
                  <div className={`text-2xl font-semibold mt-1 ${
                    isSameDay(day, new Date()) 
                      ? 'text-blue-600' 
                      : 'text-slate-900'
                  }`}>
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="relative">
              {timeSlots.map((time, timeIndex) => (
                <div
                  key={time}
                  className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-100"
                  style={{ minHeight: '60px' }}
                >
                  {/* Time Label */}
                  <div className="p-2 text-sm text-slate-500 text-right pr-4">
                    {time}
                  </div>

                  {/* Day Cells */}
                  {weekDays.map((day, dayIndex) => {
                    const appointments = getAppointmentsForDayAndTime(day, time)
                    
                    return (
                      <div
                        key={`${day}-${time}`}
                        className="relative border-l border-slate-100 p-1"
                      >
                        {appointments.map((apt) => {
                          const rowSpan = calculateRowSpan(apt.startTime, apt.endTime)
                          const colors = typeColors[apt.type]
                          
                          return (
                            <motion.div
                              key={apt.id}
                              className={`
                                absolute inset-x-1 rounded-lg p-2 cursor-pointer
                                ${colors.bg} ${colors.border} ${colors.text}
                              `}
                              style={{
                                height: `calc(${rowSpan * 60}px - 8px)`,
                                zIndex: 1
                              }}
                              whileHover={{
                                scale: 1.02,
                                zIndex: 50,
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                              }}
                              transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 25
                              }}
                            >
                              <div className="text-xs font-medium line-clamp-1">
                                {apt.clientName}
                              </div>
                              <div className="text-xs opacity-80 mt-0.5 line-clamp-1">
                                {apt.service}
                              </div>
                              <div className="text-xs opacity-70 mt-1">
                                {apt.startTime} - {apt.endTime}
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mini Calendar Sidebar */}
        {showMiniCalendar && (
          <motion.div
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
            className="w-80 border-l border-slate-100 p-4 bg-white"
          >
            <MiniCalendar
              selectedDate={currentWeekStart}
              onDateSelect={(date) => {
                setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 0 }))
                setShowMiniCalendar(false)
              }}
              locale={locale}
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}
