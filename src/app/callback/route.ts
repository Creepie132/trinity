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
      await supabase
        .from('org_users')
        .update({ user_id: user.id })
        .eq('email', user.email)
        .is('user_id', null)
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

  // 2) Check if user is owner of any organization
  const { data: ownerOrg } = await supabase
    .from('org_users')
    .select('org_id, role')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle()

  if (ownerOrg) {
    // User is owner → redirect to dashboard
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // 3) User is not owner → create new organization
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
