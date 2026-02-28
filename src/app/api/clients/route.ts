import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get org_id from org_users table
    const { data: orgUser, error: orgError } = await supabaseAdmin
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (orgError) {
      console.error('org_id lookup error:', orgError)
      return NextResponse.json(
        { error: `Database error: ${orgError.message}` },
        { status: 500 }
      )
    }

    if (!orgUser?.org_id) {
      console.error('User not linked to any organization')
      return NextResponse.json(
        { error: 'User is not linked to any organization. Please contact support.' },
        { status: 403 }
      )
    }

    // Get clients for this organization
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('org_id', orgUser.org_id)
      .order('created_at', { ascending: false })

    if (clientsError) {
      console.error('Clients fetch error:', clientsError)
      return NextResponse.json(
        { error: `Database error: ${clientsError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(clients, { status: 200 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('1. User:', user.id)

    // Get org_id from org_users table
    const { data: orgUser, error: orgError } = await supabaseAdmin
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    console.log('2. Org_id найден:', orgUser?.org_id)

    if (orgError) {
      console.error('org_id lookup error:', orgError)
      return NextResponse.json(
        { error: `Database error: ${orgError.message}` },
        { status: 500 }
      )
    }

    if (!orgUser?.org_id) {
      console.error('User not linked to any organization')
      return NextResponse.json(
        { error: 'User is not linked to any organization. Please contact support.' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await req.json()

    const clientData = {
      ...body,
      org_id: orgUser.org_id,
    }

    console.log('3. Данные клиента для вставки:', clientData)

    // Insert client using admin client (bypasses RLS)
    const { data: client, error: insertError } = await supabaseAdmin
      .from('clients')
      .insert([clientData])
      .select()
      .single()

    console.log('4. Результат вставки:', client)
    console.log('5. Ошибка вставки:', insertError)

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: String(insertError) }, { status: 500 })
    }

    console.log('Client created successfully:', client?.id)

    return NextResponse.json(client, { status: 201 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
