// src/app/callback/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const origin = request.nextUrl.origin
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

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data?.user) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(`${origin}/login`)
  }

  const user = data.user

  // Auto-link user_id for invited users
  if (user?.id && user?.email) {
    try {
      const { data: linkedRows } = await supabase
        .from('org_users')
        .update({ user_id: user.id })
        .eq('email', user.email)
        .is('user_id', null)
        .select('org_id, role')

      // Notify all system admins when an invited user first logs in
      if (linkedRows && linkedRows.length > 0) {
        notifyAdminsOfInvitedUser(user, linkedRows).catch((e) =>
          console.error('[Callback] Admin notification error:', e)
        )
      }
    } catch (e) {
      console.error('Auto-link error:', e)
    }
  }

  if (!user.id) {
    return NextResponse.redirect(`${origin}/access-pending`)
  }

  // 1) Check if admin
  const { data: admin } = await supabase
    .from('admin_users')
    .select('email')
    .eq('user_id', user.id)
    .maybeSingle()

  if (admin) {
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // 2) Check if user is a member of any organization (owner or invited staff)
  const { data: anyOrg } = await supabase
    .from('org_users')
    .select('org_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (anyOrg) {
    // User belongs to an org (owner, moderator, or invited user) → redirect to dashboard
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // 3) User has no org → create new organization (brand new signup)
  console.log('[Callback] User has no owner organization, creating new org...')
  
  try {
    // Create admin client for organization creation
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generate unique org name
    const suffix = Math.random().toString(36).substring(2, 6)
    const orgName = `${user.email?.split('@')[0] || 'user'}_${suffix}`

    console.log('[Callback] Creating organization:', orgName)

    // Create organization
    const { data: newOrg, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: orgName,
        email: user.email,
        subscription_status: 'none',
        features: {
          business_info: {
            display_name: orgName,
            owner_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            mobile: '',
            email: user.email || '',
            address: '',
            city: '',
            business_type: 'other',
            description: 'Автоматически созданная организация',
          },
          modules: {
            clients: true,
            visits: false,
            booking: false,
            inventory: false,
            payments: false,
            sms: false,
            subscriptions: false,
            statistics: false,
            reports: false,
            telegram: false,
            loyalty: false,
            birthday: false,
          },
        },
      })
      .select('id')
      .single()

    if (orgError) {
      console.error('[Callback] Organization creation error:', orgError)
      return NextResponse.redirect(`${origin}/onboarding/business-info`)
    }

    console.log('[Callback] Organization created:', newOrg.id)

    // Add user to org_users as owner
    const { error: linkError } = await supabaseAdmin
      .from('org_users')
      .insert({
        user_id: user.id,
        org_id: newOrg.id,
        email: user.email || '',
        role: 'owner',
      })

    if (linkError) {
      console.error('[Callback] User link error:', linkError)
      // Rollback: delete organization
      await supabaseAdmin.from('organizations').delete().eq('id', newOrg.id)
      return NextResponse.redirect(`${origin}/onboarding/business-info`)
    }

    console.log('[Callback] User linked as owner to new organization')
    return NextResponse.redirect(`${origin}/dashboard`)

  } catch (error) {
    console.error('[Callback] Auto-create organization error:', error)
    return NextResponse.redirect(`${origin}/onboarding/business-info`)
  }
}

// Non-blocking: notify all system admins when an invited user joins an org
async function notifyAdminsOfInvitedUser(
  user: { id: string; email?: string | null },
  linkedRows: { org_id: string; role: string }[]
) {
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  for (const row of linkedRows) {
    const [{ data: org }, { data: adminUsers }, { data: ownerRow }] = await Promise.all([
      adminClient.from('organizations').select('name, phone').eq('id', row.org_id).single(),
      adminClient.from('admin_users').select('user_id'),
      adminClient
        .from('org_users')
        .select('email')
        .eq('org_id', row.org_id)
        .eq('role', 'owner')
        .maybeSingle(),
    ])

    if (!adminUsers || adminUsers.length === 0) continue

    const orgName = org?.name || 'Unknown'
    const orgPhone = org?.phone || ''
    const inviterEmail = ownerRow?.email || ''
    const notifDate = new Date().toLocaleDateString('ru-RU')

    await adminClient.from('notifications').insert(
      adminUsers.map((admin) => ({
        org_id: row.org_id,
        user_id: admin.user_id,
        type: 'access_invitation',
        title: 'Новый запрос доступа',
        body: `${user.email} хочет присоединиться к ${orgName}. Пригласил: ${inviterEmail}. Дата: ${notifDate}`,
        metadata: {
          invited_user_email: user.email,
          invited_user_id: user.id,
          org_id: row.org_id,
          org_name: orgName,
          invited_by_email: inviterEmail,
          invited_by_phone: orgPhone,
        },
      }))
    )
  }
}
