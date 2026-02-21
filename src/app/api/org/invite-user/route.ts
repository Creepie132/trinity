// src/app/api/org/invite-user/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendWelcomeEmail } from '@/lib/emails'
import { requireOrgRole, authErrorResponse } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/org/invite-user
 * Invite a user to an organization
 * Creates org_users record with user_id=null (will be linked on first login)
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { org_id, email, role } = body

    // Validation
    if (!org_id || !email || !role) {
      return NextResponse.json(
        { error: 'org_id, email, and role are required' },
        { status: 400 }
      )
    }

    // ✅ Проверка роли (только owner)
    try {
      await requireOrgRole(org_id, ["owner"])
    } catch (e) {
      return authErrorResponse(e)
    }

    if (!['owner', 'manager', 'user'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be owner, manager, or user' },
        { status: 400 }
      )
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    console.log('[Invite User] Request:', { org_id, email: normalizedEmail, role, inviter: user.email })

    // Check if user is admin OR owner of this organization
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: ownerCheck } = await supabase
      .from('org_users')
      .select('role')
      .eq('org_id', org_id)
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .maybeSingle()

    if (!adminCheck && !ownerCheck) {
      console.log('[Invite User] ❌ Access denied - not admin or owner')
      return NextResponse.json(
        { error: 'Only admins or organization owners can invite users' },
        { status: 403 }
      )
    }

    console.log('[Invite User] ✅ Permission check passed')

    // Get organization name for email
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', org_id)
      .maybeSingle()

    const orgName = organization?.name || 'Trinity CRM'

    // Check if user already exists in this org
    const { data: existingUser } = await supabase
      .from('org_users')
      .select('user_id, email, role')
      .eq('org_id', org_id)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingUser) {
      console.log('[Invite User] User already exists in org:', existingUser)
      return NextResponse.json(
        { 
          error: 'המשתמש כבר נמצא בארגון',
          existing: true,
          user: existingUser
        },
        { status: 400 }
      )
    }

    // Insert org_users with user_id=null (will be linked on login)
    const { data: newUser, error: insertError } = await supabase
      .from('org_users')
      .insert({
        org_id,
        email: normalizedEmail,
        role,
        user_id: null, // Will be auto-linked on first login
      })
      .select('org_id, email, role, user_id, joined_at')
      .single()

    if (insertError) {
      console.error('[Invite User] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to invite user', details: insertError.message },
        { status: 500 }
      )
    }

    console.log('[Invite User] ✅ User invited successfully:', newUser)

    // Send welcome email (don't block on failure)
    sendWelcomeEmail(normalizedEmail, orgName).catch(err => {
      console.error('[Invite User] Email failed but user was created:', err)
    })

    return NextResponse.json({
      success: true,
      message: 'המשתמש נוסף בהצלחה',
      user: newUser,
      status: 'pending', // User needs to login
    })
  } catch (error: any) {
    console.error('[Invite User] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/org/invite-user
 * Remove a user from an organization
 */
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { org_id, email } = body

    if (!org_id || !email) {
      return NextResponse.json(
        { error: 'org_id and email are required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    console.log('[Remove User] Request:', { org_id, email: normalizedEmail, remover: user.email })

    // Check if user is admin OR owner of this organization
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: ownerCheck } = await supabase
      .from('org_users')
      .select('role')
      .eq('org_id', org_id)
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .maybeSingle()

    if (!adminCheck && !ownerCheck) {
      return NextResponse.json(
        { error: 'Only admins or organization owners can remove users' },
        { status: 403 }
      )
    }

    // Prevent self-removal
    if (user.email?.toLowerCase() === normalizedEmail) {
      return NextResponse.json(
        { error: 'לא ניתן להסיר את עצמך מהארגון' },
        { status: 400 }
      )
    }

    // Delete user from org
    const { error: deleteError } = await supabase
      .from('org_users')
      .delete()
      .eq('org_id', org_id)
      .eq('email', normalizedEmail)

    if (deleteError) {
      console.error('[Remove User] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove user', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log('[Remove User] ✅ User removed successfully')

    return NextResponse.json({
      success: true,
      message: 'המשתמש הוסר בהצלחה',
    })
  } catch (error: any) {
    console.error('[Remove User] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
