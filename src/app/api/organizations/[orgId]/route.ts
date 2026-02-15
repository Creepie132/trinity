import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    const orgId = params.orgId
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
      
      // Check if error is about missing columns
      if (orgError.message && (
        orgError.message.includes('column "booking_settings"') ||
        orgError.message.includes('column "slug"')
      )) {
        return NextResponse.json(
          { 
            error: 'Database migration required. Please run SQL migration from supabase/APPLY-BOOKING-MIGRATION.md',
            details: orgError.message
          },
          { status: 500 }
        )
      }
      
      throw orgError
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
