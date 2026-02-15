import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(request: Request) {
  try {
    const { orgId, booking_settings } = await request.json()

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      )
    }

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

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating booking settings:', error)
    return NextResponse.json(
      { error: 'Failed to update booking settings' },
      { status: 500 }
    )
  }
}
