import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * POST /api/demo/create-trial
 *
 * Body: { first_name, last_name, email, phone, business_name, language? }
 *
 * Создаёт Auth user + org (is_trial=true) + org_users + branch + JWT.
 * Seed данных НЕТ — пользователь начинает с чистой CRM.
 * Лимит клиентов: 30 (хранится в features.client_limit).
 *
 * org.name = business_name (уникальный constraint удалён миграцией).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      first_name, last_name, phone, business_name,
      email: userEmail = '',
      language = 'ru',
    } = body

    if (!first_name?.trim())    return NextResponse.json({ error: 'first_name required' }, { status: 400 })
    if (!last_name?.trim())     return NextResponse.json({ error: 'last_name required' }, { status: 400 })
    if (!phone?.trim())         return NextResponse.json({ error: 'phone required' }, { status: 400 })
    if (!business_name?.trim()) return NextResponse.json({ error: 'business_name required' }, { status: 400 })

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 9) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    const service        = createSupabaseServiceClient()
    const trialEmail     = `trial-${cleanPhone}@trinity-trial.internal`
    const trialPass      = crypto.randomUUID()
    const ownerFullName  = `${first_name.trim()} ${last_name.trim()}`
    const displayName    = business_name.trim()

    // ── 1. Auth user ────────────────────────────────────────────────────────
    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email:         trialEmail,
      password:      trialPass,
      email_confirm: true,
      user_metadata: {
        first_name:    first_name.trim(),
        last_name:     last_name.trim(),
        full_name:     ownerFullName,
        phone:         cleanPhone,
        contact_email: userEmail.trim() || null,
        business_name: displayName,
        language,
        is_trial:      true,
      },
    })

    if (authError) {
      const isDup = authError.message?.includes('already been registered')
        || authError.message?.includes('already exists')
        || (authError as any).code === 'email_exists'
      if (isDup) {
        return NextResponse.json(
          { error: 'PHONE_EXISTS', message: 'Аккаунт с этим номером уже существует' },
          { status: 409 }
        )
      }
      console.error('[create-trial] createUser:', authError)
      return NextResponse.json({ error: 'Failed to create user: ' + authError.message }, { status: 500 })
    }
    if (!authData?.user) return NextResponse.json({ error: 'No user returned' }, { status: 500 })
    const user = authData.user

    // ── 2. Organization ──────────────────────────────────────────────────────
    const orgId = crypto.randomUUID()

    const { error: orgError } = await service.from('organizations').insert({
      id:          orgId,
      name:        displayName,          // чистое название — constraint удалён
      email:       userEmail.trim() || null,
      phone:       cleanPhone,
      owner_email: trialEmail,
      owner_name:  ownerFullName,
      owner_phone: cleanPhone,
      plan:        'pro',
      subscription_status: 'demo',
      is_trial:    true,
      trial_started_at:  new Date().toISOString(),
      billing_status:    'trial',
      features: {
        is_demo:              true,
        is_trial:             true,
        client_limit:         30,        // лимит 30 клиентов
        whatsapp:             true,
        sms:                  true,
        loyalty:              true,
        pipeline:             true,
        onboarding_completed: true,
        language,
        business_info: {
          owner_name:    ownerFullName,
          display_name:  displayName,
          contact_email: userEmail.trim() || null,
          phone:         cleanPhone,
        },
        modules: {
          clients: true, visits: true, payments: true, analytics: true,
          inventory: true, subscriptions: true, booking: false,
          diary: true, sales: true, branches: false,
        },
      },
    })

    if (orgError) {
      await service.auth.admin.deleteUser(user.id).catch(() => {})
      console.error('[create-trial] org insert:', orgError)
      return NextResponse.json({ error: 'Failed to create org: ' + orgError.message }, { status: 500 })
    }

    // ── 3. org_users ─────────────────────────────────────────────────────────
    const { error: ouError } = await service.from('org_users').insert({
      user_id:    user.id,
      org_id:     orgId,
      email:      trialEmail,
      role:       'owner',
      first_name: first_name.trim(),
      last_name:  last_name.trim(),
      phone:      cleanPhone,
    })

    if (ouError) {
      await service.auth.admin.deleteUser(user.id).catch(() => {})
      try { await service.from('organizations').delete().eq('id', orgId) } catch {}
      console.error('[create-trial] org_users:', ouError)
      return NextResponse.json({ error: 'Failed to link user: ' + ouError.message }, { status: 500 })
    }

    // ── 4. user_active_branch ────────────────────────────────────────────────
    try {
      await service.from('user_active_branch').upsert(
        { user_id: user.id, active_org_id: orgId },
        { onConflict: 'user_id' }
      )
    } catch {}

    // ── 5. JWT: org_id → app_metadata ────────────────────────────────────────
    await service.auth.admin.updateUserById(user.id, {
      app_metadata: { org_id: orgId },
    }).catch(e => console.warn('[create-trial] updateUserById:', e))

    // Seed данных НЕ создаём — пользователь начинает с чистой CRM

    return NextResponse.json({
      ok:           true,
      org_id:       orgId,
      email:        trialEmail,
      password:     trialPass,
      display_name: displayName,
    }, { status: 201 })

  } catch (err: any) {
    console.error('[create-trial] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 })
  }
}
