import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Get landing button style from app_settings
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'landing_button_style')
      .single()

    if (error) {
      console.error('[API] Error fetching landing settings:', error)
      // Return default if no settings found
      return NextResponse.json({
        login_button_style: 'orbit'
      })
    }

    return NextResponse.json({
      login_button_style: data?.value || 'orbit'
    })
  } catch (error) {
    console.error('[API] Exception in GET /api/landing/settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('[API] No user found - unauthorized')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (adminError || !adminUser) {
      console.error('[API] Admin check failed:', adminError)
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { login_button_style } = body

    console.log('[API] Saving landing button style:', login_button_style)

    if (!login_button_style || !['orbit', 'pulse'].includes(login_button_style)) {
      console.error('[API] Invalid style:', login_button_style)
      return NextResponse.json(
        { error: 'Invalid login_button_style. Must be "orbit" or "pulse"' },
        { status: 400 }
      )
    }

    // Upsert into app_settings (key-value pattern)
    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'landing_button_style',
          value: login_button_style,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'key'
        }
      )
      .select()
      .single()

    if (error) {
      console.error('[API] Error upserting landing settings:', error)
      return NextResponse.json(
        { error: 'Failed to save settings', details: error.message },
        { status: 500 }
      )
    }

    console.log('[API] Successfully saved landing settings:', data)
    return NextResponse.json({ 
      success: true,
      login_button_style 
    })
  } catch (error) {
    console.error('[API] Exception in PATCH /api/landing/settings:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
