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

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('email')
    .eq('user_id', user.id)
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

  const { data: orgRow } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!orgRow && !isAdmin) {
    const url = req.nextUrl.clone()
    url.pathname = '/unauthorized'
    return NextResponse.redirect(url)
  }

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
```

Ключевые изменения:
- `CALLBACK_PATH` теперь `/callback` (не `/auth/callback`)
- `/` обрабатывается отдельно
- `/.well-known` добавлен для Apple Pay
```
git add .
```
```
git commit -m "Fix middleware callback path"
```
```
git push
