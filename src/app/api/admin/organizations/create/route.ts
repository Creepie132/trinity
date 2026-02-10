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

    // Get client details
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

    // TASK 2: Pre-Assignment Logic (Invitation System)
    // Check if user with this email already exists in auth.users
    const { data: existingUsers } = await supabase.rpc('get_user_by_email', {
      email_param: client.email
    })

    let assignmentResult = {
      immediate: false,
      invitation: false,
      userId: null as string | null,
    }

    if (existingUsers && existingUsers.length > 0) {
      // User exists → assign immediately to org_users
      const existingUser = existingUsers[0]
      
      const { error: orgUserError } = await supabase
        .from('org_users')
        .insert({
          org_id: org.id,
          user_id: existingUser.id,
          email: client.email,
          role: 'owner',
          invited_at: new Date().toISOString(),
        })

      if (orgUserError) {
        console.error('Error assigning user to org:', orgUserError)
        // Don't fail the request if org was created successfully
      } else {
        assignmentResult.immediate = true
        assignmentResult.userId = existingUser.id
      }
    } else {
      // User doesn't exist → create invitation
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
        console.error('Error creating invitation:', invitationError)
        // Don't fail the request if org was created successfully
      } else {
        assignmentResult.invitation = true
      }
    }

    return NextResponse.json({
      success: true,
      organization: org,
      client: {
        id: client.id,
        name: `${client.first_name} ${client.last_name}`,
        email: client.email,
      },
      assignment: assignmentResult,
      message: assignmentResult.immediate
        ? 'Organization created and owner assigned immediately'
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
