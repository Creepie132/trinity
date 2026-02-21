import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const query = searchParams.get('q')
    const org_id = searchParams.get('org_id')

    if (!query || !org_id) {
      return NextResponse.json(
        { error: 'Missing query or org_id' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const searchPattern = `%${query}%`

    // Search clients
    const { data: clients } = await supabase
      .from('clients')
      .select('id, first_name, last_name, phone, email')
      .eq('org_id', org_id)
      .or(
        `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},phone.ilike.${searchPattern},email.ilike.${searchPattern}`
      )
      .limit(5)

    // Search payments
    const { data: payments } = await supabase
      .from('payments')
      .select(`
        id,
        transaction_id,
        amount,
        currency,
        clients!inner (
          first_name,
          last_name,
          org_id
        )
      `)
      .eq('clients.org_id', org_id)
      .ilike('transaction_id', searchPattern)
      .limit(5)

    // Search services
    const { data: services } = await supabase
      .from('services')
      .select('id, name, price, duration')
      .eq('org_id', org_id)
      .ilike('name', searchPattern)
      .limit(5)

    return NextResponse.json({
      clients: clients || [],
      payments: payments || [],
      services: services || [],
    })
  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    )
  }
}
