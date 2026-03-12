import { NextRequest, NextResponse } from 'next/server'
import { validateBody, createVisitSchema } from '@/lib/validations'
import { getAuthContext } from '@/lib/auth-helpers'
import { resend, getEmailHeaders, getEmailTags } from '@/lib/resend'
import { bookingConfirmEmail, newBookingNotifyEmail } from '@/lib/email-templates'

// GET /api/visits - список визитов для текущей организации
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    
    const { orgId, supabase } = auth

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        clients(*),
        services(*),
        visit_services(*)
      `)
      .eq('org_id', orgId)
      .gte('scheduled_at', oneWeekAgo.toISOString())
      .order('scheduled_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ✅ Zod validation
    const { data, error: validationError } = validateBody(createVisitSchema, body)
    if (validationError || !data) {
      return NextResponse.json({ error: validationError || 'Validation failed' }, { status: 400 })
    }

    // Auth + org_id from JWT
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { user, orgId: org_id, supabase } = auth

    // Check meeting mode
    const { data: orgData } = await supabase
      .from('organizations')
      .select('features')
      .eq('id', org_id)
      .single()
    
    const isMeetingMode = orgData?.features?.meeting_mode === true
    console.log('[API /api/visits POST] Meeting mode:', isMeetingMode)

    // Extract and validate fields
    const { clientId, service, serviceId, date, time, duration, price, notes } = data
    
    console.log('[API /api/visits POST] Extracted fields:', {
      clientId,
      service,
      serviceId,
      date,
      time,
      duration,
      price,
      notes
    })

    // Validate required fields
    if (!clientId) {
      console.error('[API /api/visits POST] Missing clientId')
      return NextResponse.json({ error: 'חסר מזהה לקוח' }, { status: 400 })
    }
    
    // Support both service (legacy) and serviceId (new)
    if (!service && !serviceId) {
      console.error('[API /api/visits POST] Missing service or serviceId')
      return NextResponse.json({ error: 'חסר סוג שירות' }, { status: 400 })
    }
    
    if (!date || !time) {
      console.error('[API /api/visits POST] Missing date or time')
      return NextResponse.json({ error: 'חסר תאריך או שעה' }, { status: 400 })
    }
    
    // In meeting mode, price is not required
    if (!isMeetingMode && !price) {
      console.error('[API /api/visits POST] Missing price')
      return NextResponse.json({ error: 'חסר מחיר' }, { status: 400 })
    }

    // Combine date and time into ISO timestamp
    const scheduled_at = new Date(`${date}T${time}`).toISOString()
    console.log('[API /api/visits POST] Scheduled at (ISO):', scheduled_at)

    // Prepare insert data
    // UUID validation regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    // Auto-load price from service if service is selected and price not provided
    let visitPrice = price ? parseFloat(price) : 0
    
    if (!price && serviceId) {
      const selectedServiceId = serviceId
      
      // Only fetch price if it's a valid UUID (from services table)
      if (uuidRegex.test(selectedServiceId)) {
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('price, duration_minutes')
          .eq('id', selectedServiceId)
          .eq('org_id', org_id)
          .single()
        
        if (!serviceError && serviceData) {
          visitPrice = serviceData.price || 0
          console.log('[API /api/visits POST] Auto-loaded price from service:', visitPrice)
        }
      }
    }

    const insertData: any = {
      client_id: clientId,
      org_id: org_id,
      scheduled_at: scheduled_at,
      duration_minutes: duration !== null && duration !== undefined 
        ? (typeof duration === 'number' ? duration : parseInt(duration))
        : (isMeetingMode ? null : 60), // null for meetings, default 60 for visits
      price: visitPrice,
      notes: notes || null,
      status: 'scheduled',
      staff_user_id: user.id, // Track who created the visit
    }

    // Add service field (either service_id or service_type)
    if (serviceId) {
      // Check if serviceId is a valid UUID
      if (uuidRegex.test(serviceId)) {
        // It's a UUID from services table
        insertData.service_id = serviceId
        insertData.service_type = service || null
      } else {
        // It's a text identifier (service type like 'haircut', 'coloring')
        insertData.service_id = null
        insertData.service_type = serviceId
      }
    } else if (service) {
      // Legacy: only service field provided
      insertData.service_id = null
      insertData.service_type = service
    } else {
      insertData.service_id = null
      insertData.service_type = 'other'
    }

    console.log('[API /api/visits POST] Insert data:', JSON.stringify(insertData, null, 2))

    // Insert visit
    const { data: visit, error: insertError } = await supabase
      .from('visits')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('[API /api/visits POST] Insert error:', insertError)
      return NextResponse.json(
        { error: `שגיאה ביצירת ביקור: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log('[API /api/visits POST] Visit created successfully:', visit.id)

    // Award loyalty points for visit
    try {
      const { data: loyaltySettings } = await supabase
        .from('loyalty_settings')
        .select('is_enabled, points_per_visit')
        .eq('org_id', org_id)
        .single()

      if (loyaltySettings?.is_enabled && loyaltySettings.points_per_visit > 0) {
        await supabase.from('loyalty_points').insert({
          org_id,
          client_id: clientId,
          points: loyaltySettings.points_per_visit,
          type: 'earn_visit',
          description: 'Визит',
          reference_id: visit.id,
        })
        console.log('[API /api/visits POST] Awarded loyalty points:', loyaltySettings.points_per_visit)
      }
    } catch (error) {
      console.error('[API /api/visits POST] Loyalty points error (non-critical):', error)
      // Don't fail the request if loyalty fails
    }

    // Send email notifications
    try {
      // Get client info
      const { data: clientData } = await supabase
        .from('clients')
        .select('name, email, phone')
        .eq('id', clientId)
        .single()

      // Get service name
      let serviceName = 'Услуга | שירות'
      if (insertData.service_id && uuidRegex.test(insertData.service_id)) {
        const { data: serviceData } = await supabase
          .from('services')
          .select('name')
          .eq('id', insertData.service_id)
          .single()
        if (serviceData) serviceName = serviceData.name
      } else if (insertData.service_type) {
        serviceName = insertData.service_type
      }

      // Get organization info
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name, contact_email')
        .eq('id', org_id)
        .single()

      const businessName = orgData?.name || 'Trinity CRM'
      const businessEmail = orgData?.contact_email
      const visitDate = new Date(scheduled_at).toLocaleDateString('he-IL')
      const visitTime = new Date(scheduled_at).toLocaleTimeString('he-IL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })

      // Send confirmation email to client
      if (clientData?.email) {
        await resend.emails.send({
          from: 'Trinity CRM <notifications@ambersol.co.il>',
          to: clientData.email,
          subject: `✓ התור שלך אושר | Ваша запись подтверждена - ${businessName}`,
          headers: getEmailHeaders(),
          tags: getEmailTags('transactional'),
          html: bookingConfirmEmail(
            clientData.name,
            visitDate,
            visitTime,
            serviceName,
            businessName
          ),
        })
        console.log('[API /api/visits POST] Confirmation email sent to client:', clientData.email)
      }

      // Send notification email to business
      if (businessEmail) {
        await resend.emails.send({
          from: 'Trinity CRM <notifications@ambersol.co.il>',
          to: businessEmail,
          subject: `🔔 תור חדש | Новая запись - ${clientData?.name || 'Клиент'}`,
          headers: getEmailHeaders(),
          tags: getEmailTags('transactional'),
          html: newBookingNotifyEmail(
            clientData?.name || 'Клиент | לקוח',
            clientData?.phone || '',
            visitDate,
            visitTime,
            serviceName
          ),
        })
        console.log('[API /api/visits POST] Notification email sent to business:', businessEmail)
      }
    } catch (emailError) {
      console.error('[API /api/visits POST] Email error (non-critical):', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({ visit }, { status: 201 })
  } catch (error: any) {
    console.error('[API /api/visits POST] Exception:', error)
    return NextResponse.json(
      { error: `שגיאה: ${error.message}` },
      { status: 500 }
    )
  }
}
