import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient()

    // Get landing settings (public read)
    const { data, error } = await supabase
      .from('landing_settings')
      .select('*')
      .single()

    if (error) {
      console.error('[API] Error fetching landing settings:', error)
      // Return default if no settings found
      return NextResponse.json({
        login_button_style: 'orbit'
      })
    }

    return NextResponse.json(data)
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
    const supabase = createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { login_button_style } = body

    if (!login_button_style || !['orbit', 'pulse'].includes(login_button_style)) {
      return NextResponse.json(
        { error: 'Invalid login_button_style. Must be "orbit" or "pulse"' },
        { status: 400 }
      )
    }

    // Get first settings row
    const { data: existingSettings } = await supabase
      .from('landing_settings')
      .select('id')
      .single()

    if (!existingSettings) {
      // Create if doesn't exist
      const { data, error } = await supabase
        .from('landing_settings')
        .insert({ login_button_style })
        .select()
        .single()

      if (error) {
        console.error('[API] Error creating landing settings:', error)
        return NextResponse.json(
          { error: 'Failed to create settings' },
          { status: 500 }
        )
      }

      return NextResponse.json(data)
    }

    // Update existing
    const { data, error } = await supabase
      .from('landing_settings')
      .update({ login_button_style })
      .eq('id', existingSettings.id)
      .select()
      .single()

    if (error) {
      console.error('[API] Error updating landing settings:', error)
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] Exception in PATCH /api/landing/settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
