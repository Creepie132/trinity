import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { getActiveOrgId } from '@/lib/get-active-org'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Записывает/обновляет активную мобильную сессию в mobile_sessions.
 * При upsert по user_id — Supabase Realtime шлёт UPDATE,
 * который старое устройство ловит и делает logout.
 */
async function upsertMobileSession(
  service: ReturnType<typeof createSupabaseServiceClient>,
  userId: string,
  orgId: string,
  accessToken: string,
  deviceName?: string | null
) {
  const tokenHash = createHash('sha256').update(accessToken).digest('hex')
  const { error } = await service
    .from('mobile_sessions')
    .upsert(
      {
        user_id:      userId,
        org_id:       orgId,
        token_hash:   tokenHash,
        device_name:  deviceName ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
  if (error) {
    console.error('[mobile/auth] upsertMobileSession error:', error.message)
  }
}


/**
 * POST /api/mobile/auth
 * Аутентификация для мобильного приложения.
 * Body: { email: string, password: string, device_name?: string }
 * Response: { access_token, refresh_token, org_id, role, user_id, expires_at }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, device_name } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.session) {
      if (authError?.message?.toLowerCase().includes('email not confirmed')) {
        return NextResponse.json({ error: 'Email not confirmed' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const { session, user } = authData
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
    const orgRole  = user.app_metadata?.org_role ?? null
    const isAdmin  = user.app_metadata?.is_admin === true
    const mobileRole = isAdmin ? 'super_admin' : (orgRole ?? 'owner')

    const { data: orgData } = await service
      .from('organizations')
      .select('name')
      .eq('id', activeOrgId)
      .single()

    const meta = user.user_metadata ?? {}
    const userName: string =
      (meta.full_name as string | undefined) ??
      (meta.display_name as string | undefined) ??
      (user.email?.split('@')[0] ?? '')

    // Записываем/обновляем сессию — триггер для старого устройства
    await upsertMobileSession(service, user.id, activeOrgId, session.access_token, device_name)

    return NextResponse.json({
      access_token:  session.access_token,
      refresh_token: session.refresh_token,
      expires_at:    session.expires_at,
      user_id:       user.id,
      email:         user.email,
      org_id:        activeOrgId,
      main_org_id:   orgId,
      role:          mobileRole,
      is_admin:      isAdmin,
      org_name:      orgData?.name ?? null,
      user_name:     userName,
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
    let activeOrgId: string | undefined

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
        activeOrgId = await getActiveOrgId(userId, orgId)
        const { data: orgData } = await service
          .from('organizations')
          .select('name')
          .eq('id', activeOrgId)
          .single()
        orgName = orgData?.name ?? null
      }
    } catch (_) {
      // org_name non-critical
    }

    // Обновляем token_hash в сессии (токен сменился после refresh)
    // Это НЕ триггерит выброс — upsert по user_id с тем же user_id
    // лишь обновляет запись. Realtime UPDATE придёт, но Flutter
    // сравнит token_hash и поймёт что это его собственный токен.
    if (activeOrgId) {
      await upsertMobileSession(
        service,
        data.user.id,
        activeOrgId,
        data.session.access_token
      )
    }

    const refreshedIsAdmin  = data.user.app_metadata?.is_admin === true
    const refreshedOrgRole  = data.user.app_metadata?.org_role as string | null ?? null
    const refreshedRole     = refreshedIsAdmin ? 'super_admin' : (refreshedOrgRole ?? null)

    const refreshedMeta = data.user.user_metadata ?? {}
    const refreshedUserName: string =
      (refreshedMeta.full_name as string | undefined) ??
      (refreshedMeta.display_name as string | undefined) ??
      (data.user.email?.split('@')[0] ?? '')

    return NextResponse.json({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at:    data.session.expires_at,
      org_name:      orgName,
      role:          refreshedRole,
      is_admin:      refreshedIsAdmin,
      user_name:     refreshedUserName,
    })
  } catch (err) {
    console.error('[mobile/auth/refresh] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
