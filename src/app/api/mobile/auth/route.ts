import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { getActiveOrgId } from '@/lib/get-active-org'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * POST /api/mobile/auth
 * Аутентификация для мобильного приложения (FlutterFlow).
 * Принимает email+password, возвращает access_token + org_id + роль.
 *
 * Body: { email: string, password: string }
 * Response: { access_token, refresh_token, org_id, role, user_id, expires_at }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Аутентификация через Supabase
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.session) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const { session, user } = authData

    // Получаем org_id: сначала JWT claims, потом org_users
    const service = createSupabaseServiceClient()
    let orgId = user.app_metadata?.org_id as string | undefined

    if (!orgId) {
      const { data: orgUser } = await service
        .from('org_users')
        .select('org_id, role')
        .eq('user_id', user.id)
        .single()

      if (!orgUser?.org_id) {
        return NextResponse.json({ error: 'No organization found' }, { status: 403 })
      }
      orgId = orgUser.org_id
    }

    const activeOrgId = await getActiveOrgId(user.id, orgId)
    const orgRole = user.app_metadata?.org_role ?? null
    const isAdmin = user.app_metadata?.is_admin === true

    const { data: orgData } = await service
      .from('organizations')
      .select('name')
      .eq('id', activeOrgId)
      .single()

    // Если пользователь — системный администратор (is_admin), возвращаем role='super_admin'.
    // Это позволяет мобильному приложению показывать Admin Dashboard без дополнительных проверок.
    const mobileRole = isAdmin ? 'super_admin' : (orgRole ?? 'owner')

    // Имя пользователя: сначала Google full_name, потом display_name, потом часть email до @
    const meta = user.user_metadata ?? {}
    const userName: string =
      (meta.full_name as string | undefined) ??
      (meta.display_name as string | undefined) ??
      (user.email?.split('@')[0] ?? '')

    return NextResponse.json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user_id: user.id,
      email: user.email,
      org_id: activeOrgId,
      main_org_id: orgId,
      role: mobileRole,
      is_admin: isAdmin,
      org_name: orgData?.name ?? null,
      user_name: userName,
    })
  } catch (err) {
    console.error('[mobile/auth] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * PUT /api/mobile/auth
 * Обновление access_token по refresh_token.
 * Body: { refresh_token: string }
 * Response: { access_token, refresh_token, expires_at }
 */
export async function PUT(request: NextRequest) {
  try {
    const { refresh_token } = await request.json()
    if (!refresh_token) {
      return NextResponse.json({ error: 'refresh_token is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token })
    if (error || !data.session || !data.user) {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 })
    }

    const service = createSupabaseServiceClient()
    let orgName: string | null = null
    try {
      const userId = data.user.id
      let orgId = data.user.app_metadata?.org_id as string | undefined
      if (!orgId) {
        const { data: orgUser } = await service
          .from('org_users')
          .select('org_id')
          .eq('user_id', userId)
          .single()
        orgId = orgUser?.org_id
      }
      if (orgId) {
        const activeOrgId = await getActiveOrgId(userId, orgId)
        const { data: orgData } = await service
          .from('organizations')
          .select('name')
          .eq('id', activeOrgId)
          .single()
        orgName = orgData?.name ?? null
      }
    } catch (_) {
      // org_name is non-critical — don't fail the refresh
    }

    // Возвращаем role чтобы Flutter мог обновить роль после refresh.
    // Если is_admin — role='super_admin', иначе берём org_role из JWT или null (Flutter сохранит старую).
    const refreshedIsAdmin = data.user.app_metadata?.is_admin === true
    const refreshedOrgRole = data.user.app_metadata?.org_role as string | null ?? null
    const refreshedRole = refreshedIsAdmin ? 'super_admin' : (refreshedOrgRole ?? null)

    const refreshedMeta = data.user.user_metadata ?? {}
    const refreshedUserName: string =
      (refreshedMeta.full_name as string | undefined) ??
      (refreshedMeta.display_name as string | undefined) ??
      (data.user.email?.split('@')[0] ?? '')

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      org_name: orgName,
      role: refreshedRole,
      is_admin: refreshedIsAdmin,
      user_name: refreshedUserName,
    })
  } catch (err) {
    console.error('[mobile/auth/refresh] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
