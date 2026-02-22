import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ratelimitPublic, getClientIp } from '@/lib/ratelimit'
import { validateBody, createBookingSchema } from '@/lib/validations'
import { sendTelegramMessage } from '@/lib/telegram'

// Public API - no auth required
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // ✅ Rate limiting (Upstash)
    try {
      const ip = getClientIp(request)
      const { success } = await ratelimitPublic.limit(ip)
      if (!success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
      }
    } catch (e) {
      console.warn('Rate limiting unavailable:', e)
    }

    const { slug } = await params
    console.log('[Booking Book API] Creating booking for slug:', slug)
    
    const body = await request.json()
    console.log('=== BOOKING CREATE REQUEST ===')
    console.log('Body:', JSON.stringify(body, null, 2))
    
    // ✅ Zod validation
    const { data, error } = validateBody(createBookingSchema, body)
    if (error || !data) {
      console.error('[Booking Book API] Validation failed:', error)
      return NextResponse.json({ error: error || 'Validation failed' }, { status: 400 })
    }

    console.log('[Booking Book API] Validated data:', {
      service_name: data.service_name,
      client_name: data.client_name,
      scheduled_at: data.scheduled_at,
      client_phone: data.client_phone,
      notes: data.notes
    })
    
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
    } = data

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('Step 1: Finding organization by slug...')
    // Find organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, booking_settings, telegram_chat_id, telegram_notifications')
      .eq('slug', slug)
      .maybeSingle()

    console.log('Step 1 result:', { org: org?.name, error: orgError?.message })

    if (orgError) {
      console.error('[Booking Book API] Error finding org:', orgError)
      return NextResponse.json({ error: 'Database error', details: orgError.message }, { status: 500 })
    }

    if (!org) {
      console.error('[Booking Book API] Organization not found for slug:', slug)
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    console.log('[Booking Book API] Found organization:', org.name, 'ID:', org.id)
    const settings = org.booking_settings || {}

    // Check if booking is enabled
    if (!settings.enabled) {
      console.log('[Booking Book API] Booking is disabled for org:', org.name)
      return NextResponse.json(
        { error: 'Booking is not enabled for this organization' },
        { status: 403 }
      )
    }

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

    console.log('Step 2: Checking slot availability...')
    // Check for conflicts - использую visits вместо bookings
    const { data: conflicts, error: conflictError } = await supabase
      .from('visits')
      .select('id')
      .eq('org_id', org.id)
      .in('status', ['scheduled', 'completed'])
      .gte('scheduled_at', startOfSlot)
      .lt('scheduled_at', endOfSlot)

    console.log('Step 2 result:', { conflicts: conflicts?.length, error: conflictError?.message })

    if (conflictError) {
      console.error('[Booking Book API] Error checking conflicts:', conflictError)
      console.error('Conflict error details:', {
        message: conflictError.message,
        code: conflictError.code,
        details: conflictError.details,
        hint: conflictError.hint
      })
    }

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 409 }
      )
    }

    console.log('Step 3: Checking or creating client...')
    // Check if client exists, create if not (BEFORE creating visit)
    const { data: existingClient, error: clientFindError } = await supabase
      .from('clients')
      .select('id')
      .eq('org_id', org.id)
      .eq('phone', client_phone)
      .maybeSingle()

    console.log('Step 3 result:', { existingClient: existingClient?.id, error: clientFindError?.message })

    let clientId = existingClient?.id

    if (!existingClient) {
      // Create new client
      const nameParts = client_name.trim().split(' ')
      const firstName = nameParts[0] || client_name
      const lastName = nameParts.slice(1).join(' ') || ''

      console.log('Creating new client:', { firstName, lastName, phone: client_phone })

      const { data: newClient, error: clientCreateError } = await supabase
        .from('clients')
        .insert({
          org_id: org.id,
          first_name: firstName,
          last_name: lastName,
          phone: client_phone,
          email: client_email || null,
          notes: 'Created via public booking page'
        })
        .select('id')
        .single()

      if (clientCreateError) {
        console.error('[Booking Book API] Error creating client:', clientCreateError)
        console.error('Client create error details:', {
          message: clientCreateError.message,
          code: clientCreateError.code,
          details: clientCreateError.details,
          hint: clientCreateError.hint
        })
      } else {
        clientId = newClient?.id
        console.log('New client created:', clientId)
      }
    }

    // Create visit (не booking, а visit!)
    console.log('Step 4: Creating visit record...')
    const visitData = {
      org_id: org.id,
      client_id: clientId || null,
      service: service_name,
      scheduled_at,
      duration_minutes: duration_minutes || 60,
      price: price ? String(price) : null,
      status: 'scheduled',
      notes: notes || ''
    }
    
    console.log('[Booking Book API] Visit data:', visitData)

    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .insert(visitData)
      .select('id')
      .single()

    console.log('Step 4 result:', { visit_id: visit?.id, error: visitError?.message })

    if (visitError) {
      console.error('[Booking Book API] Error creating visit:', visitError)
      console.error('Visit error details:', {
        message: visitError.message,
        code: visitError.code,
        details: visitError.details,
        hint: visitError.hint
      })
      return NextResponse.json(
        { error: 'Failed to create booking', details: visitError.message },
        { status: 500 }
      )
    }

    console.log('[Booking Book API] Visit created successfully:', visit.id)

    // Send Telegram notification
    console.log('Step 5: Sending Telegram notification...')
    if (org.telegram_notifications && org.telegram_chat_id) {
      const date = new Date(scheduled_at).toLocaleDateString('he-IL')
      const time = new Date(scheduled_at).toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const telegramMessage = `📅 <b>Новая запись!</b>\n\n👤 ${client_name}\n💼 ${service_name}\n📅 ${date}\n🕐 ${time}`
      try {
        await sendTelegramMessage(org.telegram_chat_id, telegramMessage)
        console.log('Telegram notification sent')
      } catch (error) {
        console.error('Telegram notification failed:', error)
      }
    }

    // Get confirmation message
    const confirmationMessage = settings.confirmation_message_he || 'תודה שקבעת תור! נתראה בקרוב'

    console.log('=== BOOKING CREATE SUCCESS ===')
    return NextResponse.json({
      success: true,
      booking_id: visit.id,
      confirmation_message: confirmationMessage,
      scheduled_at,
      service_name,
      org_name: org.name
    })
  } catch (error: any) {
    console.error('=== BOOKING CREATE ERROR ===')
    console.error('Error:', error)
    console.error('Message:', error?.message)
    console.error('Code:', error?.code)
    console.error('Details:', error?.details)
    console.error('Hint:', error?.hint)
    console.error('Stack:', error?.stack)
    return NextResponse.json(
      { error: error?.message || 'Internal server error', details: error?.details || error?.message },
      { status: 500 }
    )
  }
}
