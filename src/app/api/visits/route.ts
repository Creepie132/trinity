import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { validateBody, createVisitSchema } from '@/lib/validations'
import { createClient } from '@/lib/supabase/server'

// GET /api/visits - список визитов для текущей организации
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: orgUser } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!orgUser) return NextResponse.json({ error: 'No organization' }, { status: 403 })

    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('org_id', orgUser.org_id)
      .limit(5)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  console.log('[API /api/visits POST] Start')
  
  try {
    const body = await request.json()
    
    // ✅ Zod validation
    const { data, error: validationError } = validateBody(createVisitSchema, body)
    if (validationError || !data) {
      console.error('[API /api/visits POST] Validation failed:', validationError)
      return NextResponse.json({ error: validationError || 'Validation failed' }, { status: 400 })
    }

    console.log('[API /api/visits POST] Request body:', JSON.stringify(data, null, 2))
    
    // Create Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[API /api/visits POST] Auth error:', authError)
      return NextResponse.json(
        { error: 'לא מחובר - נדרשת התחברות מחדש' },
        { status: 401 }
      )
    }

    console.log('[API /api/visits POST] User authenticated:', user.id)

    // Get user's organization
    const { data: orgUser, error: orgError } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgUser) {
      console.error('[API /api/visits POST] Org error:', orgError)
      return NextResponse.json(
        { error: 'לא נמצא ארגון למשתמש' },
        { status: 403 }
      )
    }

    const org_id = orgUser.org_id
    console.log('[API /api/visits POST] Organization ID:', org_id)

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
    const start_time = new Date(`${date}T${time}`).toISOString()
    console.log('[API /api/visits POST] Start time (ISO):', start_time)

    // Prepare insert data
    const insertData: any = {
      client_id: clientId,
      org_id: org_id,
      start_time: start_time,
      duration_minutes: duration !== null && duration !== undefined 
        ? (typeof duration === 'number' ? duration : parseInt(duration))
        : (isMeetingMode ? null : 60), // null for meetings, default 60 for visits
      price: price ? parseFloat(price) : 0,
      notes: notes || null,
      status: 'scheduled',
      staff_user_id: user.id, // Track who created the visit
    }

    // UUID validation regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    // Add service field (either service_id or service_name for backward compatibility)
    if (serviceId) {
      // Check if serviceId is a valid UUID
      if (uuidRegex.test(serviceId)) {
        // It's a UUID from services table
        insertData.service_id = serviceId
        insertData.service_name = service || null
      } else {
        // It's a text identifier (legacy default service)
        insertData.service_id = null
        insertData.service_name = serviceId
      }
    } else if (service) {
      // Legacy: only service field provided
      insertData.service_id = null
      insertData.service_name = service
    } else {
      insertData.service_id = null
      insertData.service_name = 'other'
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

    return NextResponse.json({ visit }, { status: 201 })
  } catch (error: any) {
    console.error('[API /api/visits POST] Exception:', error)
    return NextResponse.json(
      { error: `שגיאה: ${error.message}` },
      { status: 500 }
    )
  }
}
