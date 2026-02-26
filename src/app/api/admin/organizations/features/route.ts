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
    const body = await request.json()
    const { org_id, features, plan, subscription_update } = body

    console.log('=== UPDATE ORGANIZATION ===')
    console.log('org_id:', org_id)
    console.log('plan:', plan)
    console.log('features:', features ? 'present' : 'none')
    console.log('subscription_update:', subscription_update ? 'present' : 'none')

    if (!org_id) {
      return NextResponse.json(
        { error: 'Missing org_id' },
        { status: 400 }
      )
    }

    // Read current organization
    const { data: currentOrg, error: readError } = await supabaseAdmin
      .from('organizations')
      .select('features')
      .eq('id', org_id)
      .single()

    if (readError) {
      console.error('❌ Error reading organization:', {
        error: readError,
        code: readError.code,
        message: readError.message,
        details: readError.details,
        hint: readError.hint,
        org_id,
      })
      return NextResponse.json({ 
        error: `Failed to read organization: ${readError.message}` 
      }, { status: 500 })
    }

    // Merge features (preserve existing fields)
    const mergedFeatures = {
      ...currentOrg?.features,
      ...features,
      modules: features?.modules || currentOrg?.features?.modules,
    }

    // Build update data
    const updateData: any = { features: mergedFeatures }
    
    if (plan) {
      updateData.plan = plan
    }
    
    if (subscription_update) {
      if (subscription_update.subscription_status) {
        updateData.subscription_status = subscription_update.subscription_status
      }
      if (subscription_update.subscription_expires_at !== undefined) {
        updateData.subscription_expires_at = subscription_update.subscription_expires_at
      }
    }

    console.log('Update data:', JSON.stringify(updateData))

    // Update organization
    const { data: updateResult, error } = await supabaseAdmin
      .from('organizations')
      .update(updateData)
      .eq('id', org_id)
      .select()

    if (error) {
      console.error('❌ Update organization ERROR:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        org_id,
        updateData,
      })
      return NextResponse.json({ 
        error: `Failed to update organization: ${error.message}${error.hint ? ` (Hint: ${error.hint})` : ''}` 
      }, { status: 500 })
    }

    console.log('✅ Organization updated successfully:', {
      org_id,
      result: updateResult,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in PUT /api/admin/organizations/features:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
