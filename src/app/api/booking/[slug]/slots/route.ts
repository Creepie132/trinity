import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public API - no auth required
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // YYYY-MM-DD
    const serviceId = searchParams.get('service_id')

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, booking_settings')
      .eq('slug', slug)
      .maybeSingle()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const settings = org.booking_settings || {}
    
    // Get service duration if service_id provided
    let serviceDuration = settings.slot_duration || 30
    if (serviceId) {
      const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', serviceId)
        .maybeSingle()
      
      if (service) {
        serviceDuration = service.duration_minutes || serviceDuration
      }
    }

    // Get day of week (0 = Sunday, 6 = Saturday)
    const dateObj = new Date(date + 'T00:00:00')
    const dayOfWeek = dateObj.getDay()

    // Check working hours for this day
    const workingHours = settings.working_hours?.[dayOfWeek]
    if (!workingHours) {
      // Day off
      return NextResponse.json({ slots: [] })
    }

    // Parse working hours
    const startTime = workingHours.start || '09:00'
    const endTime = workingHours.end || '19:00'
    const slotDuration = settings.slot_duration || 30
    const minAdvanceHours = settings.min_advance_hours || 2
    const breakTime = settings.break_time

    // Get existing bookings and visits for this date
    const startOfDay = `${date}T00:00:00Z`
    const endOfDay = `${date}T23:59:59Z`

    const [bookingsRes, visitsRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('scheduled_at, duration_minutes')
        .eq('org_id', org.id)
        .gte('scheduled_at', startOfDay)
        .lte('scheduled_at', endOfDay)
        .neq('status', 'cancelled'),
      supabase
        .from('visits')
        .select('scheduled_at, duration_minutes')
        .eq('org_id', org.id)
        .gte('scheduled_at', startOfDay)
        .lte('scheduled_at', endOfDay)
        .neq('status', 'cancelled')
    ])

    const existingBookings = [
      ...(bookingsRes.data || []),
      ...(visitsRes.data || [])
    ]

    // Generate all possible slots
    const slots: { time: string; available: boolean }[] = []
    
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    
    let currentMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute
    
    const now = new Date()
    const minAdvanceMs = minAdvanceHours * 60 * 60 * 1000

    while (currentMinutes + serviceDuration <= endMinutes) {
      const hour = Math.floor(currentMinutes / 60)
      const minute = currentMinutes % 60
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      
      // Check if in break time
      let inBreak = false
      if (breakTime) {
        const [breakStartH, breakStartM] = breakTime.start.split(':').map(Number)
        const [breakEndH, breakEndM] = breakTime.end.split(':').map(Number)
        const breakStartMin = breakStartH * 60 + breakStartM
        const breakEndMin = breakEndH * 60 + breakEndM
        
        if (currentMinutes >= breakStartMin && currentMinutes < breakEndMin) {
          inBreak = true
        }
      }

      // Check if too soon (min_advance_hours)
      const slotDateTime = new Date(`${date}T${timeStr}:00`)
      const tooSoon = slotDateTime.getTime() - now.getTime() < minAdvanceMs

      // Check if slot is already booked
      const isBooked = existingBookings.some(booking => {
        const bookingDate = new Date(booking.scheduled_at)
        const bookingHour = bookingDate.getHours()
        const bookingMinute = bookingDate.getMinutes()
        const bookingStartMin = bookingHour * 60 + bookingMinute
        const bookingEndMin = bookingStartMin + (booking.duration_minutes || 60)
        
        // Check if slots overlap
        return (
          currentMinutes < bookingEndMin &&
          currentMinutes + serviceDuration > bookingStartMin
        )
      })

      slots.push({
        time: timeStr,
        available: !inBreak && !tooSoon && !isBooked
      })

      currentMinutes += slotDuration
    }

    return NextResponse.json({ slots })
  } catch (error: any) {
    console.error('[Booking Slots API] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
