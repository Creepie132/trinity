import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

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
    console.log('🔐 === AUTH CHECK START ===')
    
    // Create Supabase client with proper cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // No-op for GET requests
          },
        },
      }
    )

    // Get current user from session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log('🔐 User from session:', {
      userId: user?.id || 'null',
      email: user?.email || 'null',
      userError: userError?.message || 'none',
      hasCookies: request.cookies.getAll().length > 0,
      cookieNames: request.cookies.getAll().map(c => c.name),
    })

    if (userError || !user) {
      console.error('❌ Auth failed:', {
        error: userError?.message || 'No user in session',
        hasCookies: request.cookies.getAll().length > 0,
      })
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'No valid session found',
      }, { status: 401 })
    }

    // Check if user is admin using service role client
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('user_id, email, role, full_name')
      .eq('user_id', user.id)
      .single()

    console.log('🔐 Admin check:', {
      userId: user.id,
      adminFound: !!adminData,
      adminRole: adminData?.role || 'not found',
      adminEmail: adminData?.email || 'not found',
      adminError: adminError?.message || 'none',
      errorCode: adminError?.code || 'none',
    })

    if (adminError || !adminData) {
      console.error('❌ Admin access denied:', {
        userId: user.id,
        email: user.email,
        error: adminError?.message || 'User not in admin_users table',
        code: adminError?.code,
      })
      return NextResponse.json({ 
        error: 'Forbidden: Admin access required',
        details: 'User is not an administrator',
        userId: user.id,
        email: user.email,
      }, { status: 403 })
    }

    console.log('✅ Admin authenticated:', {
      userId: user.id,
      email: user.email,
      role: adminData.role,
      fullName: adminData.full_name,
    })

    // Get request body
    const body = await request.json()
    const { org_id, features, plan, subscription_update, owner_email } = body

    console.log('=== UPDATE ORGANIZATION ===')
    console.log('org_id:', org_id)
    console.log('plan:', plan)
    console.log('features:', features ? JSON.stringify(features) : 'none')
    console.log('subscription_update:', subscription_update ? JSON.stringify(subscription_update) : 'none')
    console.log('owner_email:', owner_email || 'none')

    // Validate required fields
    if (!org_id) {
      console.error('❌ Validation error: Missing org_id')
      return NextResponse.json(
        { error: 'Missing org_id' },
        { status: 400 }
      )
    }

    // Validate owner_email if provided
    if (owner_email) {
      // Check if email exists in auth.users
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (authError) {
        console.error('Error checking auth users:', authError)
        return NextResponse.json({ error: authError.message }, { status: 500 })
      }

      const userExists = authUser.users.some(u => u.email === owner_email)
      
      if (!userExists) {
        return NextResponse.json(
          { error: `Email ${owner_email} not found in auth.users` },
          { status: 400 }
        )
      }
    }

    // Validate subscription_status if provided
    if (subscription_update?.subscription_status) {
      const validStatuses = ['none', 'trial', 'active', 'manual', 'expired']
      if (!validStatuses.includes(subscription_update.subscription_status)) {
        console.error('❌ Validation error: Invalid subscription_status:', subscription_update.subscription_status)
        return NextResponse.json(
          { 
            error: 'Invalid subscription_status',
            details: `Must be one of: ${validStatuses.join(', ')}`,
            provided: subscription_update.subscription_status
          },
          { status: 400 }
        )
      }
    }

    // Read current organization
    const { data: currentOrg, error: readError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, features, plan, subscription_status, subscription_expires_at')
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
      
      // Check if organization doesn't exist
      if (readError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Organization not found',
          details: `No organization with id: ${org_id}`,
          code: readError.code,
        }, { status: 404 })
      }
      
      return NextResponse.json({ 
        error: `Failed to read organization: ${readError.message}`,
        code: readError.code,
        details: readError.details || 'No additional details',
        hint: readError.hint || 'Check RLS policies and permissions',
      }, { status: 500 })
    }

    console.log('✅ Current organization loaded:', {
      id: currentOrg.id,
      name: currentOrg.name,
      plan: currentOrg.plan,
      status: currentOrg.subscription_status,
    })

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
    
    if (owner_email !== undefined) {
      updateData.owner_email = owner_email
    }
    
    if (subscription_update) {
      if (subscription_update.subscription_status) {
        updateData.subscription_status = subscription_update.subscription_status
      }
      if (subscription_update.subscription_expires_at !== undefined) {
        updateData.subscription_expires_at = subscription_update.subscription_expires_at
      }
    }

    console.log('📦 Update data prepared:', {
      org_id,
      fields_to_update: Object.keys(updateData),
      plan: updateData.plan || 'unchanged',
      subscription_status: updateData.subscription_status || 'unchanged',
      subscription_expires_at: updateData.subscription_expires_at || 'unchanged',
      modules: updateData.features?.modules ? Object.keys(updateData.features.modules).length : 0,
    })
    console.log('📦 Full update data:', JSON.stringify(updateData, null, 2))

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
        updateData: JSON.stringify(updateData),
        stack: error.stack || 'No stack',
      })
      
      // Return detailed error to client
      return NextResponse.json({ 
        error: `Database error: ${error.message}`,
        code: error.code,
        details: error.details || 'No additional details',
        hint: error.hint || 'No hint available',
        org_id,
      }, { status: 500 })
    }

    console.log('✅ Organization updated successfully:', {
      org_id,
      result: updateResult,
      updatedFields: Object.keys(updateData),
    })

    return NextResponse.json({ 
      success: true, 
      organization: updateResult?.[0] 
    })
  } catch (error: any) {
    console.error('Error in PUT /api/admin/organizations/features:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
