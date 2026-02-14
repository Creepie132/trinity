import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = ['/login', '/unauthorized', '/blocked', '/landing']
const CALLBACK_PATH = '/callback'
const WEBHOOK_PATH = '/api/payments/webhook'
const STRIPE_WEBHOOK_PATH = '/api/payments/stripe-webhook'
const HEALTH_PATH = '/api/health'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow root page
  if (pathname === '/') {
    return NextResponse.next()
  }

  // Allow public routes
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    pathname === CALLBACK_PATH ||
    pathname.startsWith(CALLBACK_PATH + '?') ||
    pathname === WEBHOOK_PATH ||
    pathname.startsWith(WEBHOOK_PATH + '/') ||
    pathname === STRIPE_WEBHOOK_PATH ||
    pathname.startsWith(STRIPE_WEBHOOK_PATH + '/') ||
    pathname === HEALTH_PATH ||
    pathname.startsWith('/.well-known')
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

  // CRITICAL: ONLY check session - no DB queries
  const { data: { session } } = await supabase.auth.getSession()

  // No session → redirect to login
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Session exists → allow request
  // All other checks (admin, org_users, org status) happen on client side
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
