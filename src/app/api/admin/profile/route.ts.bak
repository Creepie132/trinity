import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET: Get admin profile with organization info
export async function GET() {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 })
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get admin data
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role')
      .eq('user_id', user.id)
      .single()

    if (adminError) {
      return NextResponse.json({ error: 'Not an admin' }, { status: 403 })
    }

    // Get organization membership (if any)
    const { data: orgUser } = await supabase
      .from('org_users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    let organization = null
    let orgPhone = ''

    if (orgUser?.org_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name, phone')
        .eq('id', orgUser.org_id)
        .single()

      if (orgData) {
        organization = {
          id: orgData.id,
          name: orgData.name,
          role: orgUser.role
        }
        orgPhone = orgData.phone || ''
      }
    }

    // Get phone from auth metadata or org
    const phone = user.phone || orgPhone

    return NextResponse.json({
      id: adminData.id,
      email: adminData.email,
      full_name: adminData.full_name,
      role: adminData.role,
      phone: phone,
      organization: organization
    })

  } catch (error: any) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Update admin profile
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 })
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!adminData) {
      return NextResponse.json({ error: 'Not an admin' }, { status: 403 })
    }

    const { full_name, phone } = await request.json()

    // Update admin_users table
    if (full_name !== undefined) {
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ full_name })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Update admin error:', updateError)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }
    }

    // Update phone in auth metadata (if provided)
    if (phone !== undefined) {
      const { error: phoneError } = await supabase.auth.updateUser({
        phone: phone
      })

      if (phoneError) {
        console.warn('Failed to update phone in auth:', phoneError)
        // Don't fail the request, just log
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'הפרופיל עודכן בהצלחה' 
    })

  } catch (error: any) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
