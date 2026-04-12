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
    console.error('[mobile/auth/google] upsertMobileSession error:', error.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { id_token, device_name } = await request.json()
    if (!id_token) {
      return NextResponse.json({ error: 'id_token is required' }, { status: 400 })
    }

    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithIdToken({
      provider: 'google',
      token: id_token,
    })

    if (authError || !authData.session) {
      console.error('[mobile/auth/google]', authError)
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 })
    }

    const { session, user } = authData
    const service = createSupabaseServiceClient()

    let orgId = user.app_metadata?.org_id as string | undefined

    if (!orgId) {
      // Попытка 1: ищем через org_users
      const { data: orgUser } = await service
        .from('org_users').select('org_id').eq('user_id', user.id).single()
      if (orgUser?.org_id) {
        orgId = orgUser.org_id
      }
    }

    if (!orgId && user.email) {
      // Попытка 2: ищем оргу по owner_email (случай когда invite упал и org_users не создался)
      const { data: orgByEmail } = await service
        .from('organizations')
        .select('id')
        .eq('owner_email', user.email.toLowerCase())
        .maybeSingle()

      if (orgByEmail?.id) {
        orgId = orgByEmail.id
        // Создаём org_users запись которой не было
        await service.from('org_users').upsert(
          { user_id: user.id, org_id: orgId, role: 'owner', email: user.email },
          { onConflict: 'user_id,org_id' }
        )
        // Обновляем app_metadata
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
        await adminClient.auth.admin.updateUserById(user.id, {
          app_metadata: { org_id: orgId, org_role: 'owner' },
        })
      }
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    const activeOrgId = await getActiveOrgId(user.id, orgId)

    const googleMeta = user.user_metadata ?? {}
    const googleUserName: string =
      (googleMeta.full_name as string | undefined) ??
      (googleMeta.name as string | undefined) ??
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
      role:          user.app_metadata?.org_role ?? null,
      is_admin:      user.app_metadata?.is_admin === true,
      user_name:     googleUserName,
    })
  } catch (err) {
    console.error('[mobile/auth/google]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
