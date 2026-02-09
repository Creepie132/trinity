import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { cookies } from 'next/headers'

// POST: Assign admin/moderator role
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const cookieStore = await cookies()
    
    // Check if current user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentAdmin } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!currentAdmin) {
      return NextResponse.json({ error: 'Not an admin' }, { status: 403 })
    }

    // Parse request body
    const { email, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }

    if (!['admin', 'moderator'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Find user_id by email in auth.users
    const { data: authUser, error: authError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single()

    if (authError || !authUser) {
      // Try alternative method using RPC or direct query
      const { data: users } = await supabase.rpc('get_user_by_email', { user_email: email })
      
      if (!users || users.length === 0) {
        return NextResponse.json({ 
          error: 'המשתמש צריך להיכנס למערכת לפחות פעם אחת' 
        }, { status: 404 })
      }
    }

    // Use service role key for admin operations
    const supabaseAdmin = createClient()

    // Check if user is already an admin
    const { data: existingAdmin } = await supabaseAdmin
      .from('admin_users')
      .select('id, role')
      .eq('email', email)
      .single()

    if (existingAdmin) {
      // Update role
      const { error: updateError } = await supabaseAdmin
        .from('admin_users')
        .update({ role })
        .eq('email', email)

      if (updateError) {
        console.error('Update admin error:', updateError)
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'התפקיד עודכן בהצלחה',
        updated: true 
      })
    }

    // Get user_id from auth (we need to query differently)
    // For now, we'll use a workaround - query from org_users or create a helper
    const { data: orgUser } = await supabaseAdmin
      .from('org_users')
      .select('user_id')
      .eq('email', email)
      .single()

    let userId = orgUser?.user_id

    if (!userId) {
      return NextResponse.json({ 
        error: 'המשתמש צריך להיכנס למערכת לפחות פעם אחת' 
      }, { status: 404 })
    }

    // Insert new admin
    const { error: insertError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        user_id: userId,
        email: email,
        role: role,
        full_name: null, // Will be updated later if needed
      })

    if (insertError) {
      console.error('Insert admin error:', insertError)
      return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'המשתמש מונה בהצלחה' 
    })

  } catch (error) {
    console.error('Admin assign error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Remove admin/moderator role
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check if current user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentAdmin } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!currentAdmin) {
      return NextResponse.json({ error: 'Not an admin' }, { status: 403 })
    }

    // Parse request body
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Cannot remove yourself
    if (user.email === email) {
      return NextResponse.json({ error: 'לא ניתן להסיר את עצמך' }, { status: 400 })
    }

    // Use service role key
    const supabaseAdmin = createClient()

    const { error: deleteError } = await supabaseAdmin
      .from('admin_users')
      .delete()
      .eq('email', email)

    if (deleteError) {
      console.error('Delete admin error:', deleteError)
      return NextResponse.json({ error: 'Failed to remove role' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'ההרשאות הוסרו בהצלחה' 
    })

  } catch (error) {
    console.error('Admin remove error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
