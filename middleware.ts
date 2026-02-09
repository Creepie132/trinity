import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = ['/login', '/unauthorized']
const CALLBACK_PATH = '/auth/callback'
const WEBHOOK_PATH = '/api/payments/webhook'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public routes + callback + webhook
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    pathname === CALLBACK_PATH ||
    pathname.startsWith(CALLBACK_PATH + '/') ||
    pathname === WEBHOOK_PATH ||
    pathname.startsWith(WEBHOOK_PATH + '/')
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 1) Session check
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  const email = user.email
  if (!email) {
    const url = req.nextUrl.clone()
    url.pathname = '/unauthorized'
    return NextResponse.redirect(url)
  }

  // 2) Admin check
  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', email)
    .maybeSingle()

  const isAdmin = !!adminRow

  if (pathname.startsWith('/admin')) {
    if (!isAdmin) {
      const url = req.nextUrl.clone()
      url.pathname = '/unauthorized'
      return NextResponse.redirect(url)
    }
    return response
  }

  // 3) Org user check
  const { data: orgRow } = await supabase
    .from('org_users')
    .select('org_id, email')
    .eq('email', email)
    .maybeSingle()

  if (!orgRow && !isAdmin) {
    const url = req.nextUrl.clone()
    url.pathname = '/unauthorized'
    return NextResponse.redirect(url)
  }

  // 4) Organization active check (skip for admins and /blocked page)
  if (orgRow && !isAdmin && pathname !== '/blocked') {
    const { data: organization } = await supabase
      .from('organizations')
      .select('is_active')
      .eq('id', orgRow.org_id)
      .maybeSingle()

    if (organization && !organization.is_active) {
      const url = req.nextUrl.clone()
      url.pathname = '/blocked'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$).*)'],
}