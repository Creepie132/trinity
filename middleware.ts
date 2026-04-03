import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ─── Public paths — O(1) Set lookup ──────────────────────────────────────────
const PUBLIC_PATH_SET = new Set([
  '/', '/login', '/unauthorized', '/blocked', '/landing',
  '/terms', '/policy', '/pricing', '/access-pending',
  '/subscription-expired', '/onboarding', '/callback',
  '/payment-success', '/payment-failed', '/payment/success', '/payment/fail',
])

const PUBLIC_PATH_PREFIXES = [
  '/demo', '/book/', '/invite/', '/register/', '/.well-known',
  '/api/demo/register', '/api/demo/activate', '/api/demo/create-trial',
  // create-trial-oauth НЕ здесь — требует сессию!
  '/api/payments/tranzila/webhook', '/api/payments/tranzila-success',
  '/api/payments/tranzila-failed', '/api/payments/cardcom-success',
  '/api/payments/tranzila/success', '/api/payments/callback',
  '/api/booking/', '/api/contact', '/api/access/', '/api/health',
  '/api/cron/',
  '/api/webhooks/',
  '/api/register/',
  '/api/beautymania/',
  '/api/mobile/',
]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATH_SET.has(pathname)) return true
  for (const prefix of PUBLIC_PATH_PREFIXES) {
    if (pathname.startsWith(prefix)) return true
  }
  return false
}

// ─── CSRF allowed origins ─────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  'https://ambersol.co.il',
  'https://www.ambersol.co.il',
  'http://localhost:3000',
  'http://localhost:3001',
])

const CSRF_EXEMPT_PREFIXES = [
  '/api/payments/', '/api/booking/', '/api/contact', '/api/access/',
  '/api/webhooks/',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublicPath(pathname)) return NextResponse.next()

  const isApiRoute = pathname.startsWith('/api/')
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  let session = null
  try {
    const result = await supabase.auth.getSession()
    session = result.data.session
  } catch (error) {
    console.error('[middleware] getSession error:', error)
    const cookiesToClear = req.cookies.getAll().filter(
      c => c.name.startsWith('sb-') || c.name.includes('supabase')
    )
    const redirect = NextResponse.redirect(new URL('/login', req.url))
    cookiesToClear.forEach(c => redirect.cookies.delete(c.name))
    return redirect
  }

  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (isApiRoute && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const isExempt = CSRF_EXEMPT_PREFIXES.some(p => pathname.startsWith(p))
    if (!isExempt) {
      const origin = req.headers.get('origin')
      const isVercelPreview = origin?.includes('vercel.app') && origin?.includes('trinity')
      if (origin && !ALLOWED_ORIGINS.has(origin) && !isVercelPreview) {
        return NextResponse.json({ error: 'CSRF: Invalid origin' }, { status: 403 })
      }
    }
  }

  if (isApiRoute) return response
  if (pathname.startsWith('/admin')) return response
  if (pathname.startsWith('/worker')) return response
  // /onboarding/trial — пользователь авторизован, но орга ещё нет: пропускаем проверку подписки
  if (pathname.startsWith('/onboarding/trial')) return response

  const MANAGER_ALLOWED_PREFIXES = ['/worker', '/clients', '/diary']
  const isManagerAllowed = MANAGER_ALLOWED_PREFIXES.some(p => pathname.startsWith(p))

  if (!isManagerAllowed) {
    const roleFromJWT = session.user.app_metadata?.org_role as string | undefined
    if (roleFromJWT === 'manager') {
      return NextResponse.redirect(new URL('/worker/dashboard', req.url))
    }
    if (!roleFromJWT) {
      try {
        const { data: orgRow } = await supabase
          .from('org_users').select('role')
          .eq('user_id', session.user.id).maybeSingle()
        if (orgRow?.role === 'manager') {
          return NextResponse.redirect(new URL('/worker/dashboard', req.url))
        }
      } catch {}
    }
  }

  if (pathname.startsWith('/inbox')) {
    const isAdmin = session.user.app_metadata?.is_admin === true
    if (!isAdmin) {
      const isSalesAgent = session.user.app_metadata?.is_sales_agent === true
      return NextResponse.redirect(
        new URL(isSalesAgent ? '/worker/pipeline' : '/dashboard', req.url)
      )
    }
  }

  const SUB_CACHE_COOKIE = 'trinity_sub_ok'
  const subCacheVal    = req.cookies.get(SUB_CACHE_COOKIE)?.value
  const subCacheOrgId  = subCacheVal?.split(':')[0]
  const subCacheTs     = parseInt(subCacheVal?.split(':')[1] ?? '0', 10)
  const SUB_CACHE_TTL  = 5 * 60 * 1000

  try {
    const isAdmin = session.user.app_metadata?.is_admin === true
    if (isAdmin) return response

    const jwtOrgId = session.user.app_metadata?.org_id as string | undefined

    if (jwtOrgId && subCacheOrgId === jwtOrgId && Date.now() - subCacheTs < SUB_CACHE_TTL) {
      return response
    }

    let org: any = null

    if (jwtOrgId) {
      const { data } = await supabase
        .from('organizations')
        .select('subscription_status, subscription_expires_at, features')
        .eq('id', jwtOrgId)
        .single()
      org = data
    } else {
      const { data: orgUser } = await supabase
        .from('org_users')
        .select('org_id, organizations(subscription_status, subscription_expires_at, features)')
        .eq('user_id', session.user.id)
        .maybeSingle()
      org = (orgUser?.organizations as any)
    }

    const now = new Date()

    const isExpired = org && (
      org.subscription_status === 'inactive' ||
      org.subscription_status === 'expired' ||
      (org.subscription_expires_at &&
        new Date(org.subscription_expires_at) < now &&
        !['active', 'manual', 'demo'].includes(org.subscription_status))
    )

    if (isExpired && pathname !== '/subscription-expired') {
      return NextResponse.redirect(new URL('/subscription-expired', req.url))
    }

    const hasAccess = org && (
      org.subscription_status === 'active' ||
      org.subscription_status === 'manual' ||
      org.subscription_status === 'demo' ||
      (org.subscription_status === 'trial' &&
        org.subscription_expires_at &&
        new Date(org.subscription_expires_at) > now)
    )

    // ── Fallback: JWT org не даёт доступа → ищем любую рабочую орг ───────────
    // Кейс: Google OAuth создал новую орг status=none при повторном входе,
    // но у пользователя уже есть рабочая demo-орг с другим org_id.
    if (!hasAccess && !isExpired) {
      try {
        const { data: rows } = await supabase
          .from('org_users')
          .select('org_id, organizations(subscription_status)')
          .eq('user_id', session.user.id)

        const workingOrg = (rows ?? []).find((r: any) => {
          const s = (r.organizations as any)?.subscription_status
          return s === 'active' || s === 'demo' || s === 'manual'
        })

        if (workingOrg) {
          // Рабочая орг найдена — сбрасываем кэш и пускаем.
          // custom_access_token_hook выдаст правильный org_id при следующем обновлении токена.
          const fwdResponse = NextResponse.next()
          fwdResponse.cookies.delete(SUB_CACHE_COOKIE)
          return fwdResponse
        }
      } catch {}

      if (pathname !== '/access-pending') {
        return NextResponse.redirect(new URL('/access-pending', req.url))
      }
    }

    // ── Module access control ────────────────────────────────────────────────
    if (hasAccess && org?.features?.modules) {
      const modules = org.features.modules as Record<string, boolean>
      const MODULE_ROUTES: Record<string, string> = {
        '/payments': 'payments', '/inventory': 'inventory',
        '/sms': 'sms', '/stats': 'statistics', '/reports': 'reports',
        '/subscriptions': 'subscriptions', '/booking': 'booking',
        '/settings/booking': 'booking', '/loyalty': 'loyalty',
      }
      for (const [route, moduleKey] of Object.entries(MODULE_ROUTES)) {
        if (pathname.startsWith(route)) {
          const hasModule = moduleKey === 'booking'
            ? (modules.booking === true || modules.online_booking === true)
            : modules[moduleKey] === true
          if (!hasModule) return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      }
    }

    if (hasAccess && jwtOrgId) {
      response.cookies.set(SUB_CACHE_COOKIE, `${jwtOrgId}:${Date.now()}`, {
        httpOnly: true, sameSite: 'lax', maxAge: SUB_CACHE_TTL / 1000, path: '/',
      })
    }
  } catch (error) {
    console.error('[middleware] Access check error:', error)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)'],
}
