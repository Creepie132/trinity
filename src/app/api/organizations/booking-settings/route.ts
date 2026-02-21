import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireOrgRole, authErrorResponse } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'

export async function PATCH(request: Request) {
  try {
    console.log('[BOOKING SETTINGS] API called')
    
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
      console.error('[BOOKING SETTINGS] Unauthorized: no user')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orgId, booking_settings } = await request.json()
    console.log('[BOOKING SETTINGS] Request:', { orgId, has_settings: !!booking_settings })

    if (!orgId) {
      console.error('[BOOKING SETTINGS] Missing orgId')
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      )
    }

    // ✅ Проверка роли (только owner)
    try {
      await requireOrgRole(orgId, ["owner"])
    } catch (e) {
      return authErrorResponse(e)
    }

    // Check user has access to this org
    const { data: orgUser, error: orgUserError } = await supabase
      .from('org_users')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (orgUserError || !orgUser) {
      console.error('[BOOKING SETTINGS] Access denied:', orgUserError)
      return NextResponse.json(
        { error: 'Access denied to this organization' },
        { status: 403 }
      )
    }

    console.log('[BOOKING SETTINGS] User has access, role:', orgUser.role)

    // Convert working_hours from day names to day numbers (for booking page)
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    }

    const working_hours_numeric: Record<number, any> = {}
    if (booking_settings.working_hours) {
      Object.entries(booking_settings.working_hours).forEach(([dayName, hours]) => {
        const dayNum = dayMap[dayName as keyof typeof dayMap]
        if (dayNum !== undefined && (hours as any).enabled) {
          working_hours_numeric[dayNum] = {
            start: (hours as any).start,
            end: (hours as any).end
          }
        }
      })
    }

    // Prepare settings for database (booking page format)
    const dbSettings = {
      ...booking_settings,
      working_hours: working_hours_numeric,
      advance_days: booking_settings.max_days_ahead || 30,
      min_advance_hours: booking_settings.min_advance_hours || 24,
      slot_duration: booking_settings.slot_duration || 60,
      break_time: booking_settings.break_times?.[0] || null,
      confirmation_message_he: booking_settings.confirm_message_he || '',
      confirmation_message_ru: booking_settings.confirm_message_ru || ''
    }

    console.log('[BOOKING SETTINGS] Converted settings:', {
      working_hours: working_hours_numeric,
      advance_days: dbSettings.advance_days
    })

    // Use service role key for update
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update organization with booking settings and slug
    const { data, error} = await supabaseAdmin
      .from('organizations')
      .update({
        booking_settings: dbSettings,
        slug: booking_settings.slug,
      })
      .eq('id', orgId)
      .select()
      .single()

    if (error) {
      console.error('[BOOKING SETTINGS] Update error:', error)
      
      // Check if error is about missing column
      if (error.message && (
        error.message.includes('column "booking_settings"') ||
        error.message.includes('column "slug"')
      )) {
        return NextResponse.json(
          { 
            error: 'Database migration required. Please run: supabase/APPLY-BOOKING-MIGRATION.md',
            details: error.message
          },
          { status: 500 }
        )
      }
      
      throw error
    }

    // ✅ Audit log
    await logAudit({
      org_id: orgId,
      user_id: user.id,
      user_email: user.email || '',
      action: "update",
      entity_type: "organization",
      entity_id: orgId,
      new_data: { booking_settings: dbSettings },
      ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    })

    console.log('[BOOKING SETTINGS] Success! Updated org:', data.id)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[BOOKING SETTINGS] Fatal error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update booking settings' },
      { status: 500 }
    )
  }
}
