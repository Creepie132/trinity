import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Admin client with SERVICE_ROLE key (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(req: NextRequest) {
  try {
    // Get current user from session
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create regular supabase client to verify user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log('1. User:', user?.id)

    if (userError || !user) {
      console.error('User error:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
