/**
 * POST /api/mobile/admin/orgs/create
 * Создание новой организации + Google-инвайт владельцу.
 * Auth: Bearer токен. Только super_admin.
 *
 * Body:
 *   email:   string   — email владельца
 *   name:    string   — название организации
 *   status:  string   — 'demo' | 'trial' | 'active' (default: 'demo')
 *   modules: Record<string, boolean> — начальные модули (optional)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { initModulesState, applyLinkedKeys } from '@/lib/modules-config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function requireSuperAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return null
  const jwt = authHeader.slice(7)
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data, error } = await anonClient.auth.getUser(jwt)
  if (error || !data.user) return null
  const isAdmin = data.user.app_metadata?.is_admin === true
  const orgRole = data.user.app_metadata?.org_role as string | null
  if (!isAdmin && orgRole !== 'super_admin') return null
  return data.user
}

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(request: NextRequest) {
  try {
    // ── 1. Auth ───────────────────────────────────────────────────────────────
    const user = await requireSuperAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Forbidden: super_admin only' }, { status: 403 })
    }

    // ── 2. Body ───────────────────────────────────────────────────────────────
    const body = await request.json()
    const { email, name, status = 'demo', modules: requestedModules } = body as {
      email:    string
      name:     string
      status?:  string
      modules?: Record<string, boolean>
    }

    if (!email || !name) {
      return NextResponse.json({ error: 'email и name обязательны' }, { status: 400 })
    }

    const normalEmail    = email.trim().toLowerCase()
    const allowedStatuses = ['demo', 'trial', 'active', 'manual', 'free']
    const orgStatus      = allowedStatuses.includes(status) ? status : 'demo'

    // ── 3. Проверка дубля email ───────────────────────────────────────────────
    const service = createSupabaseServiceClient()
    const { data: existing } = await service
      .from('organizations')
      .select('id')
      .eq('owner_email', normalEmail)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Организация с этим email уже существует' },
        { status: 409 },
      )
    }

    // ── 4. Подготовка модулей ─────────────────────────────────────────────────
    let modulesState: Record<string, boolean>
    if (requestedModules && typeof requestedModules === 'object') {
      let resolved = { ...requestedModules }
      for (const [key, value] of Object.entries(requestedModules)) {
        resolved = applyLinkedKeys(resolved, key, value)
      }
      modulesState = resolved
    } else {
      const base = initModulesState({})
      modulesState = { ...base, clients: true, visits: true }
    }

    // ── 5. Создаём организацию ────────────────────────────────────────────────
    const { data: org, error: orgError } = await service
      .from('organizations')
      .insert({
        name:                name.trim(),
        owner_email:         normalEmail,
        subscription_status: orgStatus,
        features: { modules: modulesState },
      })
      .select('id, name, subscription_status, owner_email')
      .single()

    if (orgError || !org) {
      console.error('[admin/orgs/create] insert org error:', orgError)
      return NextResponse.json({ error: 'Ошибка создания организации' }, { status: 500 })
    }

    // ── 6. Google OAuth invite ────────────────────────────────────────────────
    const adminClient = createAdminClient()
    // ВАЖНО: redirectTo должен быть в списке разрешённых URL в Supabase Dashboard
    // Authentication → URL Configuration → Redirect URLs
    const redirectTo = 'https://www.ambersol.co.il/auth/callback'
    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(normalEmail, {
        redirectTo,
        data: { org_id: org.id, org_role: 'owner' },
      })

    let inviteUserId: string | null = null
    let inviteSent = false
    let inviteErrorMessage: string | null = null

    if (inviteError) {
      console.warn('[admin/orgs/create] invite warning:', inviteError.message)
      inviteErrorMessage = inviteError.message
    } else {
      inviteUserId = inviteData.user?.id ?? null
      inviteSent   = true
    }

    // ── 7. org_users + app_metadata если пользователь получен ────────────────
    if (inviteUserId) {
      await service.from('org_users').upsert(
        { user_id: inviteUserId, org_id: org.id, role: 'owner', email: normalEmail },
        { onConflict: 'user_id,org_id' },
      )
      await adminClient.auth.admin.updateUserById(inviteUserId, {
        app_metadata: { org_id: org.id, org_role: 'owner' },
      })
    }

    return NextResponse.json({
      ok:            true,
      org_id:        org.id,
      org_name:      org.name,
      org_status:    org.subscription_status,
      invite_sent:   inviteSent,
      invite_email:  normalEmail,
      invite_error:  inviteErrorMessage,
    })
  } catch (err: any) {
    console.error('[admin/orgs/create] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
