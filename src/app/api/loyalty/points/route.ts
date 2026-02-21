import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Get client's loyalty points balance and history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const client_id = searchParams.get('client_id')
    const org_id = searchParams.get('org_id')

    if (!client_id || !org_id) {
      return NextResponse.json({ error: 'Missing client_id or org_id' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get balance
    const { data: balanceData } = await supabase
      .from('loyalty_points')
      .select('points')
      .eq('client_id', client_id)
      .eq('org_id', org_id)

    const balance = balanceData?.reduce((sum, row) => sum + row.points, 0) || 0

    // Get history
    const { data: history, error } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('client_id', client_id)
      .eq('org_id', org_id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ balance, history: history || [] })
  } catch (error: any) {
    console.error('Get loyalty points error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch points', details: error.message },
      { status: 500 }
    )
  }
}

// Add or redeem points
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { org_id, client_id, points, type, description, reference_id } = body

    if (!org_id || !client_id || !points || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('loyalty_points')
      .insert({
        org_id,
        client_id,
        points,
        type,
        description: description || null,
        reference_id: reference_id || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Add loyalty points error:', error)
    return NextResponse.json(
      { error: 'Failed to add points', details: error.message },
      { status: 500 }
    )
  }
}
