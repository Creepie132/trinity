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

  // 2) Check if org user
  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (orgUser) {
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // No admin, no org → redirect to access-pending (will auto-create request)
  return NextResponse.redirect(`${origin}/access-pending`)
}
