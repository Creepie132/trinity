import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

// Service role client (bypasses RLS)
const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: admin } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Get all module pricing
    console.log('=== LOAD MODULE PRICING ===')
    const { data, error } = await supabaseAdmin
      .from('module_pricing')
      .select('*')
      .order('sort_order', { ascending: true })

    console.log('Module pricing:', data?.length, 'Error:', error)

    if (error) {
      console.error('Error fetching module pricing:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Error in GET /api/admin/module-pricing:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: admin } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Update module pricing
    const { modules } = await request.json()

    if (!modules || !Array.isArray(modules)) {
      return NextResponse.json({ error: 'Invalid modules data' }, { status: 400 })
    }

    console.log('=== UPDATE MODULE PRICING ===')
    console.log('Updating', modules.length, 'modules')

    // Update each module
    const updates = modules.map((module: any) =>
      supabaseAdmin
        .from('module_pricing')
        .update({
          price_monthly: module.price_monthly,
          is_available: module.is_available,
          updated_at: new Date().toISOString(),
        })
        .eq('id', module.id)
    )

    const results = await Promise.all(updates)

    // Check for errors
    const errors = results.filter((r) => r.error)
    if (errors.length > 0) {
      console.error('Some updates failed:', errors)
      return NextResponse.json({ error: 'Some updates failed' }, { status: 500 })
    }

    console.log('✅ All modules updated successfully')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in PUT /api/admin/module-pricing:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
