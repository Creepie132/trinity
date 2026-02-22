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
    console.log('=== BOOKING REQUEST START ===')
    console.log('Slug:', slug)
    
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    // ✅ Zod validation
    const { data, error } = validateBody(createBookingSchema, body)
    if (error || !data) {
      console.error('Validation failed:', error)
      return NextResponse.json({ error: error || 'Validation failed' }, { status: 400 })
    }

    console.log('Validated data:', {
      service_id: data.service_id,
      service_name: data.service_name,
      client_name: data.client_name,
      scheduled_at: data.scheduled_at
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

    // ✅ Use service role for public API
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('Step 1: Finding organization by slug...')
    // Find organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, booking_settings, telegram_chat_id, telegram_notifications')
      .eq('slug', slug)
      .maybeSingle()

    if (orgError) {
      console.error('Org lookup error:', orgError)
      return NextResponse.json({ error: 'Database error', details: orgError.message }, { status: 500 })
    }

    if (!org) {
      console.error('Organization not found for slug:', slug)
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    console.log('Found organization:', org.name, 'ID:', org.id)
    const settings = org.booking_settings || {}

    // Check if booking is enabled
    if (!settings.enabled) {
      console.log('Booking is disabled for org:', org.name)
      return NextResponse.json(
        { error: 'Booking is not enabled for this organization' },
        { status: 403 }
      )
    }

    // Validate date is not in the past
    const scheduledDate = new Date(scheduled_at)
    const now = new Date()
    if (scheduledDate < now) {
      console.error('Date in past:', scheduled_at)
      return NextResponse.json({ error: 'Cannot book in the past' }, { status: 400 })
    }

    // Validate advance_days
    const maxAdvanceDays = settings.advance_days || 30
    const maxDate = new Date(now)
    maxDate.setDate(maxDate.getDate() + maxAdvanceDays)
    if (scheduledDate > maxDate) {
      console.error('Date too far in future:', scheduled_at)
      return NextResponse.json(
        { error: `Cannot book more than ${maxAdvanceDays} days in advance` },
        { status: 400 }
      )
    }

    // Validate min_advance_hours
    const minAdvanceHours = settings.min_advance_hours || 2
    const minAdvanceMs = minAdvanceHours * 60 * 60 * 1000
    if (scheduledDate.getTime() - now.getTime() < minAdvanceMs) {
      console.error('Too soon:', scheduled_at, 'need', minAdvanceHours, 'hours')
      return NextResponse.json(
        { error: `Need at least ${minAdvanceHours} hours advance notice` },
        { status: 400 }
      )
    }

    // Check if day is a working day
    const dayOfWeek = scheduledDate.getDay()
    const workingHours = settings.working_hours?.[dayOfWeek]
    if (!workingHours) {
      console.error('Not a working day:', dayOfWeek)
      return NextResponse.json(
        { error: 'Selected day is not a working day' },
        { status: 400 }
      )
    }

    console.log('Step 2: Checking slot availability...')
    // Check if slot is available
    const endOfSlot = new Date(scheduledDate.getTime() + (duration_minutes || 60) * 60 * 1000).toISOString()

    const { data: conflicts, error: conflictError } = await supabaseAdmin
      .from('visits')
      .select('id')
      .eq('org_id', org.id)
      .in('status', ['scheduled', 'completed'])
      .gte('scheduled_at', scheduled_at)
      .lt('scheduled_at', endOfSlot)

    if (conflictError) {
      console.error('Conflict check error:', conflictError)
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
    }

    if (conflicts && conflicts.length > 0) {
      console.error('Slot conflict detected:', conflicts.length, 'conflicts')
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 409 }
      )
    }

    console.log('Step 3: Finding or creating client...')
    // Normalize phone (remove spaces, dashes, etc)
    const normalizedPhone = client_phone.replace(/[\s\-()]/g, '')

    const { data: existingClient, error: clientFindError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('org_id', org.id)
      .eq('phone', normalizedPhone)
      .maybeSingle()

    if (clientFindError) {
      console.error('Client lookup error:', clientFindError)
      return NextResponse.json({ error: 'Failed to lookup client' }, { status: 500 })
    }

    let clientId = existingClient?.id

    if (!existingClient) {
      console.log('Creating new client...')
      // Create new client
      const nameParts = client_name.trim().split(' ')
      const firstName = nameParts[0] || client_name
      const lastName = nameParts.slice(1).join(' ') || ''

      const { data: newClient, error: clientCreateError } = await supabaseAdmin
        .from('clients')
        .insert({
          org_id: org.id,
          first_name: firstName,
          last_name: lastName,
          phone: normalizedPhone,
          email: client_email || null,
          notes: 'Created via public booking page'
        })
        .select('id')
        .single()

      if (clientCreateError) {
        console.error('Client create error:', clientCreateError)
        return NextResponse.json(
          { error: 'Failed to create client', details: clientCreateError.message },
          { status: 500 }
        )
      }

      clientId = newClient.id
      console.log('New client created:', clientId)
    } else {
      console.log('Existing client found:', clientId)
    }

    // Ensure clientId exists before creating visit
    if (!clientId) {
      console.error('No client_id after lookup/create')
      return NextResponse.json(
        { error: 'Failed to resolve client' },
        { status: 500 }
      )
    }

    console.log('Step 4: Creating visit record...')
    // ✅ Create visit with correct field names
    const visitData: any = {
      org_id: org.id,
      client_id: clientId,
      scheduled_at: scheduled_at,
      duration_minutes: duration_minutes || 60,
      price: price || 0, // ✅ Store as number, not string
      status: 'scheduled',
      notes: notes || '',
      staff_user_id: null, // ✅ No staff user for public bookings
      source: 'online_booking'
    }

    // ✅ Handle service_id vs service_type correctly
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    
    if (service_id && uuidRegex.test(service_id)) {
      // Valid UUID - use service_id
      visitData.service_id = service_id
      visitData.service_type = service_name // Store name as fallback
    } else {
      // No service_id or invalid - use service_type only
      visitData.service_id = null
      visitData.service_type = service_name
    }
    
    console.log('Visit data:', JSON.stringify(visitData, null, 2))

    const { data: visit, error: visitError } = await supabaseAdmin
      .from('visits')
      .insert(visitData)
      .select('id')
      .single()

    if (visitError) {
      console.error('Visit create error:', visitError)
      console.error('Error details:', {
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

    console.log('Visit created successfully:', visit.id)

    // ✅ Create visit_services entry if service_id exists
    console.log('Step 5: Checking visit_services creation...')
    console.log('service_id:', service_id)
    console.log('is UUID?', service_id ? uuidRegex.test(service_id) : false)
    
    if (service_id && uuidRegex.test(service_id)) {
      console.log('Creating visit_services entry...')
      const { error: vsError } = await supabaseAdmin
        .from('visit_services')
        .insert({
          visit_id: visit.id,
          service_id: service_id,
          quantity: 1
        })

      if (vsError) {
        console.error('❌ Visit service creation failed:', vsError)
        console.error('Error details:', {
          message: vsError.message,
          code: vsError.code,
          details: vsError.details,
          hint: vsError.hint
        })
        // Don't fail the whole booking if visit_services fails
      } else {
        console.log('✅ Visit service linked successfully')
      }
    } else {
      console.log('Skipping visit_services creation (no valid service_id)')
    }

    // Send Telegram notification
    console.log('Step 6: Sending Telegram notification...')
    if (org.telegram_notifications && org.telegram_chat_id) {
      const date = new Date(scheduled_at).toLocaleDateString('he-IL')
      const time = new Date(scheduled_at).toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const telegramMessage = `📅 <b>Новая запись онлайн!</b>\n\n👤 ${client_name}\n📞 ${client_phone}\n💼 ${service_name}\n📅 ${date}\n🕐 ${time}\n💰 ₪${price || 0}`
      
      try {
        await sendTelegramMessage(org.telegram_chat_id, telegramMessage)
        console.log('Telegram notification sent')
      } catch (error) {
        console.error('Telegram notification failed (non-fatal):', error)
      }
    }

    // Get confirmation message
    const confirmationMessage = settings.confirmation_message_he || 'תודה שקבעת תור! נתראה בקרוב'

    console.log('=== BOOKING SUCCESS ===')
    console.log('Booking ID:', visit.id)
    
    return NextResponse.json({
      success: true,
      booking_id: visit.id,
      confirmation_message: confirmationMessage,
      scheduled_at,
      service_name,
      org_name: org.name
    })
  } catch (error: any) {
    console.error('=== BOOKING FATAL ERROR ===')
    console.error('Error:', error)
    console.error('Message:', error?.message)
    console.error('Stack:', error?.stack)
    return NextResponse.json(
      { error: error?.message || 'Internal server error', details: error?.details || error?.message },
      { status: 500 }
    )
  }
}
