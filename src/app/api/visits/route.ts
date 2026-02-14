import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  console.log('[API /api/visits POST] Start')
  
  try {
    const body = await request.json()
    console.log('[API /api/visits POST] Request body:', JSON.stringify(body, null, 2))
    
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

    // Extract and validate fields
    const { clientId, service, serviceId, date, time, duration, price, notes } = body
    
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
    
    if (!price) {
      console.error('[API /api/visits POST] Missing price')
      return NextResponse.json({ error: 'חסר מחיר' }, { status: 400 })
    }

    // Combine date and time into ISO timestamp
    const scheduled_at = new Date(`${date}T${time}`).toISOString()
    console.log('[API /api/visits POST] Scheduled at (ISO):', scheduled_at)

    // Prepare insert data
    const insertData: any = {
      client_id: clientId,
      org_id: org_id,
      scheduled_at: scheduled_at,
      duration_minutes: parseInt(duration) || 60,
      price: parseFloat(price),
      notes: notes || null,
      status: 'scheduled',
    }

    // UUID validation regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    // Add service field (either service_id or service_type for backward compatibility)
    if (serviceId) {
      // Check if serviceId is a valid UUID
      if (uuidRegex.test(serviceId)) {
        // It's a UUID from services table
        insertData.service_id = serviceId
        insertData.service_type = service || null
      } else {
        // It's a text identifier (legacy default service)
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

    return NextResponse.json({ visit }, { status: 201 })
  } catch (error: any) {
    console.error('[API /api/visits POST] Exception:', error)
    return NextResponse.json(
      { error: `שגיאה: ${error.message}` },
      { status: 500 }
    )
  }
}
