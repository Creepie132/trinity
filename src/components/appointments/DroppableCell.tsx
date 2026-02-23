'use client'

import { useDroppable } from '@dnd-kit/core'
import { ReactNode } from 'react'

interface DroppableCellProps {
  day: Date
  time: string
  children: ReactNode
}

export function DroppableCell({ day, time, children }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${day.toISOString()}-${time}`,
    data: { day, time }
  })

  return (
    <div
      ref={setNodeRef}
      className={`
        relative border-l border-slate-100 p-1 transition-colors duration-150
        ${isOver ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : ''}
      `}
    >
      {/* Ghost placeholder when hovering */}
      {isOver && (
        <div className="absolute inset-1 rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/50 pointer-events-none" />
      )}
      {children}
    </div>
  )
}
