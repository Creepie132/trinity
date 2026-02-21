import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const org_id = searchParams.get('org_id')

    if (!org_id) {
      return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('loyalty_settings')
      .select('*')
      .eq('org_id', org_id)
      .maybeSingle()

    if (error) throw error

    // Return default settings if not found
    if (!data) {
      return NextResponse.json({
        is_enabled: false,
        points_per_ils: 1,
        points_per_visit: 10,
        redemption_rate: 0.1,
      })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Get loyalty settings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { org_id, is_enabled, points_per_ils, points_per_visit, redemption_rate } = body

    if (!org_id) {
      return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('loyalty_settings')
      .upsert({
        org_id,
        is_enabled: is_enabled ?? false,
        points_per_ils: points_per_ils ?? 1,
        points_per_visit: points_per_visit ?? 10,
        redemption_rate: redemption_rate ?? 0.1,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Save loyalty settings error:', error)
    return NextResponse.json(
      { error: 'Failed to save settings', details: error.message },
      { status: 500 }
    )
  }
}
