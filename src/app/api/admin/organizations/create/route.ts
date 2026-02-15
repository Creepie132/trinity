import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendWelcomeEmail } from '@/lib/emails'

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  console.log(`[CREATE ORG ${requestId}] 🚀 API called at ${new Date().toISOString()}`)
  
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
    const { name, category, plan, clientId, newClient } = body

    if (!name || !category || !plan) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, plan' },
        { status: 400 }
      )
    }

    // TASK 2: Handle both existing client and new client modes
    let client: {
      id: string
      first_name: string
      last_name: string
      email: string
      phone: string | null
    }

    if (newClient) {
      // MODE: New Client - Create client first
      console.log('[CREATE ORG] 📝 Creating new client:', newClient.email)

      if (!newClient.firstName || !newClient.lastName || !newClient.email) {
        return NextResponse.json(
          { error: 'New client requires firstName, lastName, and email' },
          { status: 400 }
        )
      }

      // Create client in CRM (without org_id yet, will be assigned after org creation)
      const { data: createdClient, error: createClientError } = await supabase
        .from('clients')
        .insert({
          first_name: newClient.firstName,
          last_name: newClient.lastName,
          email: newClient.email,
          phone: newClient.phone || null,
          org_id: null, // Will be updated after org creation
        })
        .select('id, first_name, last_name, email, phone')
        .single()

      if (createClientError || !createdClient) {
        console.error('[CREATE ORG] ❌ Error creating client:', createClientError)
        return NextResponse.json(
          { error: `Failed to create client: ${createClientError?.message}` },
          { status: 500 }
        )
      }

      console.log('[CREATE ORG] ✅ Client created with CRM ID:', createdClient.id)
      client = createdClient
    } else if (clientId) {
      // MODE: Existing Client - Fetch from database
      console.log('[CREATE ORG] 🔍 Fetching existing client:', clientId)

      // CRITICAL FIX: Get client ONLY for email, NEVER use client.id for permissions
      // The client.id from public.clients is DIFFERENT from auth.users.id!
      const { data: existingClient, error: clientError } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, phone')
        .eq('id', clientId)
        .single()

      if (clientError || !existingClient) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }

      if (!existingClient.email) {
        return NextResponse.json(
          { error: 'Client must have an email address' },
          { status: 400 }
        )
      }

      console.log('[CREATE ORG] ✅ Existing client found')
      client = existingClient
    } else {
      return NextResponse.json(
        { error: 'Either clientId or newClient must be provided' },
        { status: 400 }
      )
    }

    console.log('[CREATE ORG] ⚠️  Client details:')
    console.log('[CREATE ORG]    - Client CRM ID:', client.id)
    console.log('[CREATE ORG]    - Client Email:', client.email)
    console.log('[CREATE ORG]    - ⚠️  DO NOT USE client.id for permissions!')

    // CRITICAL: Normalize email to lowercase for consistency
    const normalizedEmail = client.email.toLowerCase()

    // BUG FIX: Check for duplicate organization before INSERT
    console.log('[CREATE ORG] 🔍 Checking for existing organization with name:', name)
    const { data: existing, error: checkError } = await supabase
      .from('organizations')
      .select('*')
      .ilike('name', name)
      .maybeSingle()

    if (existing) {
      console.log('[CREATE ORG] ⚠️  DUPLICATE DETECTED! Returning existing org:', existing.id)
      console.log('[CREATE ORG]    - Name:', existing.name)
      console.log('[CREATE ORG]    - This prevents double-click / race condition bugs')
      
      // Check if user is already assigned
      const { data: existingOrgUser } = await supabase
        .from('org_users')
        .select('*')
        .eq('org_id', existing.id)
        .eq('email', normalizedEmail)
        .maybeSingle()
      
      return NextResponse.json({
        success: true,
        organization: existing,
        client: {
          id: client.id,
          name: `${client.first_name} ${client.last_name}`,
          email: client.email,
        },
        assignment: {
          immediate: !!existingOrgUser?.user_id,
          invitation: !existingOrgUser?.user_id,
          userId: existingOrgUser?.user_id || null,
          authUserId: existingOrgUser?.user_id || null,
          clientCrmId: client.id,
          note: 'Duplicate request detected, returned existing organization',
        },
        message: 'Organization already exists (duplicate prevented)',
      })
    }

    console.log('[CREATE ORG] ✅ No duplicate found, creating new organization')

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        email: normalizedEmail,
        phone: client.phone || null,
        category,
        plan,
      })
      .select()
      .single()

    if (orgError) {
      console.error('[CREATE ORG] ❌ Error creating organization:', orgError)
      return NextResponse.json(
        { error: `Failed to create organization: ${orgError.message}` },
        { status: 500 }
      )
    }

    console.log('[CREATE ORG] ✅ Organization created:', org.id)

    // TASK 2: If new client was created, update their org_id
    if (newClient) {
      console.log('[CREATE ORG] 📝 Updating client org_id to:', org.id)
      const { error: updateClientError } = await supabase
        .from('clients')
        .update({ org_id: org.id })
        .eq('id', client.id)

      if (updateClientError) {
        console.error('[CREATE ORG] ⚠️  Warning: Could not update client org_id:', updateClientError)
        // Non-fatal, continue
      } else {
        console.log('[CREATE ORG] ✅ Client org_id updated')
      }
    }

    // CRITICAL FIX: Lookup user in auth.users by EMAIL (not by client.id!)
    // The client.id from public.clients is DIFFERENT from auth.users.id
    console.log('[CREATE ORG] 🔍 Looking up user in auth.users by email:', normalizedEmail)
    
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('[CREATE ORG] ❌ Error listing auth users:', listError)
      // Continue anyway, will create invitation
    }

    // Find user by email (case-insensitive)
    // This returns the REAL auth user ID, NOT the CRM client ID
    const existingAuthUser = authUsers?.users?.find(
      u => u.email?.toLowerCase() === normalizedEmail
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
          email: normalizedEmail,
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

        // Send welcome email (don't block on failure)
        sendWelcomeEmail(normalizedEmail, name).catch(err => {
          console.error('[CREATE ORG] 📧 Email failed but user was created:', err)
        })
      }
    } else {
      // User doesn't exist in auth.users → create invitation AND org_users entry with user_id = null
      console.log('[CREATE ORG] ℹ️  User NOT found in auth.users, creating invitation + org_users entry')
      console.log('[CREATE ORG]    - Will be auto-linked when they sign up')
      
      // CRITICAL: Create org_users entry with user_id = null (will be linked on first login)
      const { error: orgUserError } = await supabase
        .from('org_users')
        .insert({
          org_id: org.id,
          user_id: null, // ← Will be filled by /api/org/link-user on first login
          email: normalizedEmail,
          role: 'owner',
          invited_at: new Date().toISOString(),
        })

      if (orgUserError) {
        console.error('[CREATE ORG] ❌ Error creating org_users entry:', orgUserError)
        return NextResponse.json(
          { error: `Failed to create org_users entry: ${orgUserError.message}` },
          { status: 500 }
        )
      }

      console.log('[CREATE ORG] ✅ Created org_users entry with user_id=null (will auto-link)')
      
      // Also create invitation for tracking purposes
      const { error: invitationError } = await supabase
        .from('invitations')
        .insert({
          email: normalizedEmail,
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
        console.log('[CREATE ORG] ✅ Invitation created for email:', normalizedEmail)
        assignmentResult.invitation = true

        // Send welcome email (don't block on failure)
        sendWelcomeEmail(normalizedEmail, name).catch(err => {
          console.error('[CREATE ORG] 📧 Email failed but user was created:', err)
        })
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
