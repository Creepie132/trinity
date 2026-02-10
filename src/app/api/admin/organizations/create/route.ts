import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
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
        },
      }
    )

    // Check admin authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, category, plan, clientId } = body

    if (!name || !category || !plan || !clientId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, plan, clientId' },
        { status: 400 }
      )
    }

    // CRITICAL FIX: Get client ONLY for email, NEVER use client.id for permissions
    // The client.id from public.clients is DIFFERENT from auth.users.id!
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (!client.email) {
      return NextResponse.json(
        { error: 'Client must have an email address' },
        { status: 400 }
      )
    }

    console.log('[CREATE ORG] ⚠️  Selected client from CRM:')
    console.log('[CREATE ORG]    - Client CRM ID:', client.id)
    console.log('[CREATE ORG]    - Client Email:', client.email)
    console.log('[CREATE ORG]    - ⚠️  DO NOT USE client.id for permissions!')

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        email: client.email,
        phone: client.phone || null,
        category,
        plan,
      })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating organization:', orgError)
      return NextResponse.json(
        { error: `Failed to create organization: ${orgError.message}` },
        { status: 500 }
      )
    }

    // CRITICAL FIX: Lookup user in auth.users by EMAIL (not by client.id!)
    // The client.id from public.clients is DIFFERENT from auth.users.id
    console.log('[CREATE ORG] 🔍 Looking up user in auth.users by email:', client.email)
    
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('[CREATE ORG] ❌ Error listing auth users:', listError)
      // Continue anyway, will create invitation
    }

    // Find user by email (case-insensitive)
    // This returns the REAL auth user ID, NOT the CRM client ID
    const existingAuthUser = authUsers?.users?.find(
      u => u.email?.toLowerCase() === client.email.toLowerCase()
    )

    let assignmentResult = {
      immediate: false,
      invitation: false,
      userId: null as string | null,
      authUserId: null as string | null,
      clientCrmId: client.id, // For debugging only
    }

    if (existingAuthUser) {
      // CRITICAL: User exists in auth.users → use AUTH USER ID (not client.id!)
      console.log('[CREATE ORG] ✅ User found in auth.users:')
      console.log('[CREATE ORG]    - Auth User ID:', existingAuthUser.id, '← USE THIS')
      console.log('[CREATE ORG]    - Auth Email:', existingAuthUser.email)
      console.log('[CREATE ORG]    - Client CRM ID:', client.id, '← IGNORE THIS')
      console.log('[CREATE ORG]    - ⚠️  IMPORTANT: Using Auth ID, NOT Client ID!')
      
      // CRITICAL: Insert into org_users with AUTH USER ID (existingAuthUser.id)
      // NEVER use client.id here - it's a different UUID!
      const { error: orgUserError } = await supabase
        .from('org_users')
        .insert({
          org_id: org.id,
          user_id: existingAuthUser.id, // ← CRITICAL: Auth ID, NOT client.id
          email: client.email,
          role: 'owner',
          invited_at: new Date().toISOString(),
        })

      if (orgUserError) {
        console.error('[CREATE ORG] ❌ Error assigning user to org:', orgUserError)
        return NextResponse.json(
          { error: `Failed to assign user: ${orgUserError.message}` },
          { status: 500 }
        )
      } else {
        console.log('[CREATE ORG] ✅ User assigned immediately to org_users')
        console.log('[CREATE ORG]    - Inserted user_id:', existingAuthUser.id)
        console.log('[CREATE ORG]    - org_id:', org.id)
        assignmentResult.immediate = true
        assignmentResult.userId = existingAuthUser.id
        assignmentResult.authUserId = existingAuthUser.id
      }
    } else {
      // User doesn't exist in auth.users → create invitation
      console.log('[CREATE ORG] ℹ️  User NOT found in auth.users, creating invitation')
      console.log('[CREATE ORG]    - Will be assigned automatically when they sign up')
      
      const { error: invitationError } = await supabase
        .from('invitations')
        .insert({
          email: client.email,
          org_id: org.id,
          role: 'owner',
          invited_by: user.id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })

      if (invitationError) {
        console.error('[CREATE ORG] ❌ Error creating invitation:', invitationError)
        return NextResponse.json(
          { error: `Failed to create invitation: ${invitationError.message}` },
          { status: 500 }
        )
      } else {
        console.log('[CREATE ORG] ✅ Invitation created for email:', client.email)
        assignmentResult.invitation = true
      }
    }

    return NextResponse.json({
      success: true,
      organization: org,
      client: {
        id: client.id, // CRM client ID (for display only)
        name: `${client.first_name} ${client.last_name}`,
        email: client.email,
      },
      assignment: {
        ...assignmentResult,
        // NOTE: userId is the AUTH USER ID (from auth.users), NOT client.id
        note: 'userId is the auth.users.id (Supabase Auth), NOT the CRM client.id',
      },
      message: assignmentResult.immediate
        ? 'Organization created and owner assigned immediately (using Auth User ID)'
        : 'Organization created, invitation sent. Owner will be assigned on first login.',
    })
  } catch (error: any) {
    console.error('Error in create organization API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
