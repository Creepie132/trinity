import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public API - no auth required
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Use service role key for public access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find organization by slug
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('slug', slug)
      .maybeSingle()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get booking settings from dedicated table
    const { data: bookingSettings } = await supabase
      .from('booking_settings')
      .select('*')
      .eq('org_id', org.id)
      .single()

    // Check if booking is enabled
    if (!bookingSettings?.enabled) {
      return NextResponse.json(
        { error: 'Booking is not enabled for this organization' },
        { status: 403 }
      )
    }

    // Get active services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, name_ru, price, duration_minutes, color')
      .eq('org_id', org.id)
      .eq('is_active', true)
      .order('name')

    if (servicesError) {
      console.error('[Booking API] Error fetching services:', servicesError)
    }

    return NextResponse.json({
      id: org.id,
      name: org.name,
      booking_settings: bookingSettings,
      services: services || [],
    })
  } catch (error: any) {
    console.error('[Booking API] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
