// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin

  if (!code) {
    return NextResponse.redirect(new URL('/login', baseUrl))
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data?.user) {
    return NextResponse.redirect(new URL('/login', baseUrl))
  }

  const email = data.user.email
  if (!email) {
    return NextResponse.redirect(new URL('/unauthorized', baseUrl))
  }

  // 1) admin?
  const { data: admin } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', email)
    .maybeSingle()

  if (admin) {
    return NextResponse.redirect(new URL('/admin', baseUrl))
  }

  // 2) org user?
  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id, email')
    .eq('email', email)
    .maybeSingle()

  if (orgUser) {
    return NextResponse.redirect(new URL('/', baseUrl))
  }

  return NextResponse.redirect(new URL('/unauthorized', baseUrl))
}