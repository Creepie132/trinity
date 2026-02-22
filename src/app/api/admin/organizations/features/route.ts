import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client (bypasses RLS)
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

export async function PUT(request: NextRequest) {
  try {
    // Check auth
    const authHeader = request.headers.get('cookie')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user from cookie
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: authHeader,
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (adminError || !adminData) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Get request body
    const { org_id, features, subscription_update } = await request.json()

    if (!org_id) {
      return NextResponse.json(
        { error: 'Missing org_id' },
        { status: 400 }
      )
    }

    // Handle subscription update
    if (subscription_update) {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .update(subscription_update)
        .eq('id', org_id)
        .select()
        .single()

      if (error) {
        console.error('Error updating subscription:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }

    // Handle features update
    if (!features) {
      return NextResponse.json(
        { error: 'Missing features or subscription_update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update({ features })
      .eq('id', org_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization features:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error in PUT /api/admin/organizations/features:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
