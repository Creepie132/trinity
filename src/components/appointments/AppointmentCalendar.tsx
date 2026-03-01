'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns'
import { he, ru, enUS } from 'date-fns/locale'
import { 
  DndContext, 
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { MiniCalendar } from './MiniCalendar'
import { DraggableAppointment } from './DraggableAppointment'
import { DroppableCell } from './DroppableCell'

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

export const typeColors = {
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
  const [appointments, setAppointments] = useState(mockAppointments)
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 0 })
  )
  const [showMiniCalendar, setShowMiniCalendar] = useState(false)
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const isRTL = locale === 'he'
  const dateLocale = localeMap[locale]

  const weekDays = Array.from({ length: 7 }, (_, i) => 
    addDays(currentWeekStart, i)
  )

  // DnD sensors with long-press for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 5,
      },
    })
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
    return appointments.filter(apt => 
      isSameDay(apt.date, day) && apt.startTime === time
    )
  }

  const calculateRowSpan = (startTime: string, endTime: string) => {
    const startIndex = timeSlots.indexOf(startTime)
    const endIndex = timeSlots.indexOf(endTime)
    return endIndex - startIndex
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    // Block scroll during drag
    document.body.style.touchAction = 'none'
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    // Re-enable scroll
    document.body.style.touchAction = ''
    setActiveId(null)

    if (!over) return

    const newDay = over.data.current?.day as Date
    const newStartTime = over.data.current?.time as string

    if (!newDay || !newStartTime) return

    console.log('Moved:', active.id, '→', format(newDay, 'yyyy-MM-dd'), newStartTime)
    
    // Update appointment position (local state only, no Supabase yet)
    setAppointments(prev => 
      prev.map(apt => 
        apt.id === active.id 
          ? { ...apt, date: newDay, startTime: newStartTime }
          : apt
      )
    )
    
    // TODO: supabase update
    // await supabase
    //   .from('visits')
    //   .update({ scheduled_at: newDay, start_time: newStartTime })
    //   .eq('id', active.id)
  }

  const handleDragCancel = () => {
    document.body.style.touchAction = ''
    setActiveId(null)
  }

  const activeAppointment = appointments.find(apt => apt.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
                className={`px-4 py-1.5 text-sm rounded transition-colors ${
                  viewMode === 'week' 
                    ? 'bg-slate-900 text-white' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setViewMode('week')}
              >
                Week
              </button>
              <button
                className={`px-4 py-1.5 text-sm rounded transition-colors ${
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
                {timeSlots.map((time) => (
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
                    {weekDays.map((day) => {
                      const cellAppointments = getAppointmentsForDayAndTime(day, time)
                      
                      return (
                        <DroppableCell
                          key={`${day}-${time}`}
                          day={day}
                          time={time}
                        >
                          {cellAppointments.map((apt) => {
                            const rowSpan = calculateRowSpan(apt.startTime, apt.endTime)
                            
                            return (
                              <DraggableAppointment
                                key={apt.id}
                                appointment={apt}
                                rowSpan={rowSpan}
                                isDragging={apt.id === activeId}
                              />
                            )
                          })}
                        </DroppableCell>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mini Calendar Sidebar */}
          {showMiniCalendar && (
            <div
              className={`w-80 border-l border-slate-100 p-4 bg-white transition-all duration-200 ${
                isRTL ? 'slide-in-left' : 'slide-in-right'
              }`}
            >
              <MiniCalendar
                selectedDate={currentWeekStart}
                onDateSelect={(date) => {
                  setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 0 }))
                  setShowMiniCalendar(false)
                }}
                locale={locale}
              />
            </div>
          )}
        </div>

        {/* Drag Overlay (ghost that follows cursor) */}
        <DragOverlay>
          {activeAppointment && (
            <div
              className={`
                rounded-lg p-2 cursor-grabbing shadow-2xl
                ${typeColors[activeAppointment.type].bg} 
                ${typeColors[activeAppointment.type].border} 
                ${typeColors[activeAppointment.type].text}
              `}
              style={{
                width: '180px',
                opacity: 0.9
              }}
            >
              <div className="text-xs font-medium line-clamp-1">
                {activeAppointment.clientName}
              </div>
              <div className="text-xs opacity-80 mt-0.5 line-clamp-1">
                {activeAppointment.service}
              </div>
              <div className="text-xs opacity-70 mt-1">
                {activeAppointment.startTime} - {activeAppointment.endTime}
              </div>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  )
}
