import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    console.log('[GET ORG] Loading organization:', orgId)

    // Authenticate user
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

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('[GET ORG] Unauthorized: no user')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check user has access to this org
    const { data: orgUser, error: orgUserError } = await supabase
      .from('org_users')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (orgUserError || !orgUser) {
      console.error('[GET ORG] Access denied:', orgUserError)
      return NextResponse.json(
        { error: 'Access denied to this organization' },
        { status: 403 }
      )
    }

    console.log('[GET ORG] User has access, role:', orgUser.role)

    // Fetch organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (orgError) {
      console.error('[GET ORG] Fetch error:', orgError)
      throw orgError
    }

    // Fetch booking settings from dedicated table
    const { data: bookingSettingsData } = await supabase
      .from('booking_settings')
      .select('*')
      .eq('org_id', orgId)
      .single()

    // Attach booking_settings to org object for backward compatibility
    if (bookingSettingsData) {
      const numToDay: Record<number, string> = {
        0: 'sunday',
        1: 'monday',
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday'
      }

      // Convert working_hours from numeric format (0-6) back to day names for UI
      if (bookingSettingsData.working_hours) {
        const working_hours_named: Record<string, any> = {}
        Object.entries(numToDay).forEach(([num, dayName]) => {
          const hours = bookingSettingsData.working_hours[Number(num)]
          working_hours_named[dayName] = hours 
            ? { enabled: true, start: hours.start, end: hours.end }
            : { enabled: false, start: '09:00', end: '17:00' }
        })
        bookingSettingsData.working_hours = working_hours_named
      }

      bookingSettingsData.max_days_ahead = bookingSettingsData.advance_days || 30
      bookingSettingsData.break_times = bookingSettingsData.break_time 
        ? [bookingSettingsData.break_time]
        : []
      bookingSettingsData.confirm_message_he = bookingSettingsData.confirmation_message_he || ''
      bookingSettingsData.confirm_message_ru = bookingSettingsData.confirmation_message_ru || ''

      ;(org as any).booking_settings = bookingSettingsData
    }

    console.log('[GET ORG] Success! Loaded org:', org.name)
    return NextResponse.json({ success: true, data: org })
  } catch (error: any) {
    console.error('[GET ORG] Fatal error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load organization' },
      { status: 500 }
    )
  }
}
