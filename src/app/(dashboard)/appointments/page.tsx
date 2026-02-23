'use client'

import { AppointmentCalendar } from '@/components/appointments/AppointmentCalendar'

export default function AppointmentsPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <AppointmentCalendar locale="en" />
    </div>
  )
}
