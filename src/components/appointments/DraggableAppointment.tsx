'use client'

import { useDraggable } from '@dnd-kit/core'
import { typeColors } from './AppointmentCalendar'

interface Appointment {
  id: string
  clientName: string
  service: string
  startTime: string
  endTime: string
  type: 'consultation' | 'surgery' | 'meeting' | 'checkup'
}

interface DraggableAppointmentProps {
  appointment: Appointment
  rowSpan: number
  isDragging: boolean
}

export function DraggableAppointment({ 
  appointment, 
  rowSpan, 
  isDragging 
}: DraggableAppointmentProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: appointment.id,
    data: appointment
  })

  const colors = typeColors[appointment.type]

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        transition: 'transform 150ms ease',
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        absolute inset-x-1 rounded-lg p-2 cursor-grab active:cursor-grabbing
        transition-all duration-150 hover:scale-[1.02] hover:shadow-2xl hover:z-50
        ${colors.bg} ${colors.border} ${colors.text}
        ${isDragging ? 'opacity-40' : 'opacity-100'}
      `}
      style={{
        ...style,
        height: `calc(${rowSpan * 60}px - 8px)`,
        zIndex: isDragging ? 0 : 1,
        touchAction: 'none',
      }}
    >
      <div className="text-xs font-medium line-clamp-1">
        {appointment.clientName}
      </div>
      <div className="text-xs opacity-80 mt-0.5 line-clamp-1">
        {appointment.service}
      </div>
      <div className="text-xs opacity-70 mt-1">
        {appointment.startTime} - {appointment.endTime}
      </div>
    </div>
  )
}
