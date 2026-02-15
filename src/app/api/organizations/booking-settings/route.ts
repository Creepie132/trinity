import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

    // Use service role key for update
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update organization with booking settings and slug
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update({
        booking_settings,
        slug: booking_settings.slug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId)
      .select()
      .single()

    if (error) {
      console.error('[BOOKING SETTINGS] Update error:', error)
      throw error
    }

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
