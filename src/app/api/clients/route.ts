import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { orgId } = auth

    // Get clients for this organization (using admin to bypass RLS)
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('org_id', orgId)
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
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { orgId } = auth

    // Parse request body
    const body = await req.json()

    const clientData = {
      ...body,
      first_name: body.first_name || body.name?.split(' ')[0] || '',
      last_name: body.last_name || body.name?.split(' ').slice(1).join(' ') || '',
      org_id: orgId,
    }
    delete clientData.name

    // Insert client using admin client (bypasses RLS)
    const { data: client, error: insertError } = await supabaseAdmin
      .from('clients')
      .insert([clientData])
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: String(insertError) }, { status: 500 })
    }

    return NextResponse.json(client, { status: 201 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
