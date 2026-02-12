// src/app/callback/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')

  // CRITICAL FIX: Always use request.nextUrl.origin for redirects
  // This works on both localhost AND production (Vercel) automatically
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
  
  // CRITICAL: Auto-link user_id IMMEDIATELY after getting user
  // This must happen BEFORE any checks (admin/org) to ensure user has access
  if (user?.id && user?.email) {
    console.log('[Callback] Auto-linking user_id for email:', user.email)
    try {
      const { data: linkedRows, error: linkError } = await supabase
        .from('org_users')
        .update({ user_id: user.id })
        .eq('email', user.email)
        .is('user_id', null)
        .select('org_id, email, role')
      
      if (linkError) {
        console.error('[Callback] Auto-link error:', linkError)
      } else if (linkedRows && linkedRows.length > 0) {
        console.log('[Callback] ✅ Auto-linked user to', linkedRows.length, 'organization(s)')
        console.log('[Callback] Organizations:', linkedRows.map(r => r.org_id))
      } else {
        console.log('[Callback] No pending invitations for this email')
      }
    } catch (e) {
      console.error('[Callback] Auto-link exception:', e)
      // Non-fatal, continue
    }
  }

  if (!user.id) {
    return NextResponse.redirect(`${origin}/unauthorized`)
  }

  // 1) Check if admin (use user_id, not email)
  const { data: admin } = await supabase
    .from('admin_users')
    .select('email')
    .eq('user_id', user.id)
    .maybeSingle()

  if (admin) {
    return NextResponse.redirect(`${origin}/admin`)
  }

  // 2) Check if org user (use user_id, not email)
  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (orgUser) {
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  return NextResponse.redirect(`${origin}/unauthorized`)
}