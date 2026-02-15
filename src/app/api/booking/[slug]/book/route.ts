import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public API - no auth required
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const {
      service_id,
      service_name,
      client_name,
      client_phone,
      client_email,
      scheduled_at,
      duration_minutes,
      price,
      notes
    } = body

    // Validation
    if (!service_name || !client_name || !client_phone || !scheduled_at) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, booking_settings')
      .eq('slug', slug)
      .maybeSingle()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const settings = org.booking_settings || {}

    // Validate date is not in the past
    const scheduledDate = new Date(scheduled_at)
    const now = new Date()
    if (scheduledDate < now) {
      return NextResponse.json({ error: 'Cannot book in the past' }, { status: 400 })
    }

    // Validate advance_days
    const maxAdvanceDays = settings.advance_days || 30
    const maxDate = new Date(now)
    maxDate.setDate(maxDate.getDate() + maxAdvanceDays)
    if (scheduledDate > maxDate) {
      return NextResponse.json(
        { error: `Cannot book more than ${maxAdvanceDays} days in advance` },
        { status: 400 }
      )
    }

    // Validate min_advance_hours
    const minAdvanceHours = settings.min_advance_hours || 2
    const minAdvanceMs = minAdvanceHours * 60 * 60 * 1000
    if (scheduledDate.getTime() - now.getTime() < minAdvanceMs) {
      return NextResponse.json(
        { error: `Need at least ${minAdvanceHours} hours advance notice` },
        { status: 400 }
      )
    }

    // Check if day is a working day
    const dayOfWeek = scheduledDate.getDay()
    const workingHours = settings.working_hours?.[dayOfWeek]
    if (!workingHours) {
      return NextResponse.json(
        { error: 'Selected day is not a working day' },
        { status: 400 }
      )
    }

    // Check if slot is available
    const scheduledTime = `${scheduledDate.getHours().toString().padStart(2, '0')}:${scheduledDate.getMinutes().toString().padStart(2, '0')}`
    const scheduledMinutes = scheduledDate.getHours() * 60 + scheduledDate.getMinutes()
    
    const startOfSlot = scheduledDate.toISOString()
    const endOfSlot = new Date(scheduledDate.getTime() + (duration_minutes || 60) * 60 * 1000).toISOString()

    // Check for conflicts
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('org_id', org.id)
      .neq('status', 'cancelled')
      .or(`and(scheduled_at.lt.${endOfSlot},scheduled_at.gte.${startOfSlot})`)

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 409 }
      )
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        org_id: org.id,
        service_id: service_id || null,
        service_name,
        client_name,
        client_phone,
        client_email: client_email || null,
        scheduled_at,
        duration_minutes: duration_minutes || 60,
        price: price || null,
        status: 'pending',
        notes: notes || null
      })
      .select('id')
      .single()

    if (bookingError) {
      console.error('[Booking Book API] Error creating booking:', bookingError)
      return NextResponse.json(
        { error: 'Failed to create booking', details: bookingError.message },
        { status: 500 }
      )
    }

    // Check if client exists, create if not
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('org_id', org.id)
      .eq('phone', client_phone)
      .maybeSingle()

    if (!existingClient) {
      // Create new client
      const nameParts = client_name.trim().split(' ')
      const firstName = nameParts[0] || client_name
      const lastName = nameParts.slice(1).join(' ') || ''

      await supabase.from('clients').insert({
        org_id: org.id,
        first_name: firstName,
        last_name: lastName,
        phone: client_phone,
        email: client_email || null,
        notes: 'Created via public booking page'
      })
    }

    // Get confirmation message
    const confirmationMessage = settings.confirmation_message_he || 'תודה שקבעת תור! נתראה בקרוב'

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      confirmation_message: confirmationMessage,
      scheduled_at,
      service_name,
      org_name: org.name
    })
  } catch (error: any) {
    console.error('[Booking Book API] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
