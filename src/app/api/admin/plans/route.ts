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

    // Get all plans
    console.log('=== LOAD PLANS ===')
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .order('sort_order', { ascending: true })

    console.log('Plans:', data?.length, 'Error:', error)
    console.log('Plans data:', JSON.stringify(data))
    console.log('Plans error:', JSON.stringify(error))

    if (error) {
      console.error('Error fetching plans:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Error in GET /api/admin/plans:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Create new plan
    const body = await request.json()
    
    console.log('Creating new plan:', body)

    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .insert(body)
      .select()
      .single()

    if (error) {
      console.error('Error creating plan:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error in POST /api/admin/plans:', error)
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

    // Update plan
    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing plan id' }, { status: 400 })
    }

    console.log('Updating plan:', id, updates)

    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating plan:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error in PUT /api/admin/plans:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    // Delete plan
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing plan id' }, { status: 400 })
    }

    console.log('Deleting plan:', id)

    const { error } = await supabaseAdmin
      .from('subscription_plans')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting plan:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/plans:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
