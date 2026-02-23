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
    const { org_id, features, subscription_update, plan } = await request.json()

    console.log('=== EXTEND SUBSCRIPTION ===')
    console.log('org_id:', org_id)
    console.log('subscription_update:', JSON.stringify(subscription_update))
    console.log('plan:', plan)
    console.log('features:', features ? 'present' : 'none')

    if (!org_id) {
      return NextResponse.json(
        { error: 'Missing org_id' },
        { status: 400 }
      )
    }

    // Handle subscription update (with optional plan and features update)
    if (subscription_update) {
      const updateData: any = { ...subscription_update }
      
      if (plan) {
        updateData.plan = plan
      }
      
      // If features are also provided, merge them
      if (features) {
        // Read current features first
        const { data: org, error: readError } = await supabaseAdmin
          .from('organizations')
          .select('features')
          .eq('id', org_id)
          .single()

        if (readError) {
          console.error('Error reading organization:', readError)
          return NextResponse.json({ error: readError.message }, { status: 500 })
        }

        // Deep merge features
        const currentFeatures = org?.features || {}
        updateData.features = {
          ...currentFeatures,
          ...features,
          modules: {
            ...(currentFeatures.modules || {}),
            ...(features.modules || {}),
          },
        }
      }

      const { data, error } = await supabaseAdmin
        .from('organizations')
        .update(updateData)
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

    // 1. Read current features from DB
    const { data: org, error: readError } = await supabaseAdmin
      .from('organizations')
      .select('features')
      .eq('id', org_id)
      .single()

    if (readError) {
      console.error('Error reading organization:', readError)
      return NextResponse.json({ error: readError.message }, { status: 500 })
    }

    // 2. Deep merge features (preserve other fields like business_info, dashboard_charts, etc.)
    const currentFeatures = org?.features || {}
    const mergedFeatures = {
      ...currentFeatures,
      ...features,
      // Deep merge nested objects if they exist
      modules: {
        ...(currentFeatures.modules || {}),
        ...(features.modules || {}),
      },
    }

    // 3. Update with merged features (and optional plan)
    const updateData: any = { features: mergedFeatures }
    if (plan) {
      updateData.plan = plan
    }

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(updateData)
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
