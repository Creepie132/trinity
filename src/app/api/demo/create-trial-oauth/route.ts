import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * POST /api/demo/create-trial-oauth
 *
 * Auth-First trial creation.
 * Берёт user.id из активной Supabase сессии (Google OAuth уже пройден).
 * НЕ создаёт нового auth user — только org + org_users + branch.
 *
 * Body: { first_name, last_name, phone, business_name, language? }
 */
export async function POST(request: NextRequest) {
  try {
    // ── 1. Проверяем сессию ────────────────────────────────────────────────
    const supabaseUser = await createClient()
    const { data: { user }, error: sessionError } = await supabaseUser.auth.getUser()

    if (sessionError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized — please sign in with Google first' },
        { status: 401 },
      )
    }

    // ── 2. Проверяем нет ли уже орг у этого пользователя ──────────────────
    const service = createSupabaseServiceClient()

    const { data: existingOrg } = await service
      .from('org_users')
      .select('org_id, organizations(subscription_status)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (existingOrg?.org_id) {
      const status = (existingOrg.organizations as any)?.subscription_status
      if (status && status !== 'none') {
        return NextResponse.json(
          { error: 'ALREADY_HAS_ORG', message: 'У вас уже есть организация' },
          { status: 409 },
        )
      }
    }

    // ── 3. Валидация тела запроса ──────────────────────────────────────────
    const body = await request.json()
    const {
      first_name,
      last_name,
      phone,
      business_name,
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

    // ── 4. Проверяем уникальность телефона ─────────────────────────────────
    const { data: phoneCheck } = await service
      .from('organizations')
      .select('id')
      .eq('phone', cleanPhone)
      .limit(1)
      .maybeSingle()

    if (phoneCheck) {
      return NextResponse.json(
        { error: 'PHONE_EXISTS', message: 'Организация с этим номером уже существует' },
        { status: 409 },
      )
    }

    const ownerFullName = `${first_name.trim()} ${last_name.trim()}`
    const displayName   = business_name.trim()
    const userEmail     = user.email ?? null

    // ── 5. Создаём организацию ─────────────────────────────────────────────
    const orgId = crypto.randomUUID()
    // Демо бессрочный — нет subscription_expires_at.
    // Доступ ограничен лимитами (10 клиентов / 15 визитов / 5 товаров / 5 задач).
    // Переход на подписку снимает все ограничения и сохраняет все данные.

    const { error: orgError } = await service.from('organizations').insert({
      id:          orgId,
      name:        displayName,
      email:       userEmail,
      phone:       cleanPhone,
      owner_email: userEmail,
      owner_name:  ownerFullName,
      owner_phone: cleanPhone,
      plan:        'pro',
      subscription_status: 'demo',
      // subscription_expires_at намеренно не устанавливаем — демо бессрочный
      is_trial:    true,
      trial_started_at: new Date().toISOString(),
      billing_status:   'trial',
      features: {
        is_demo:              true,
        is_trial:             true,
        client_limit:         10,
        visit_limit:          15,
        visit_active_limit:   3,
        product_limit:        5,
        task_limit:           5,
        whatsapp:             true,
        sms:                  true,
        loyalty:              true,
        pipeline:             true,
        onboarding_completed: true,
        language,
        business_info: {
          owner_name:    ownerFullName,
          display_name:  displayName,
          contact_email: userEmail,
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
      console.error('[create-trial-oauth] org insert:', orgError)
      return NextResponse.json({ error: 'Failed to create org: ' + orgError.message }, { status: 500 })
    }

    // ── 6. Привязываем пользователя к орг ─────────────────────────────────
    const { error: ouError } = await service.from('org_users').insert({
      user_id:    user.id,
      org_id:     orgId,
      email:      userEmail ?? '',
      role:       'owner',
      first_name: first_name.trim(),
      last_name:  last_name.trim(),
      phone:      cleanPhone,
    })

    if (ouError) {
      // Rollback
      try { await service.from('organizations').delete().eq('id', orgId) } catch {}
      console.error('[create-trial-oauth] org_users:', ouError)
      return NextResponse.json({ error: 'Failed to link user: ' + ouError.message }, { status: 500 })
    }

    // ── 7. user_active_branch ──────────────────────────────────────────────
    try {
      await service
        .from('user_active_branch')
        .upsert({ user_id: user.id, active_org_id: orgId }, { onConflict: 'user_id' })
    } catch {}

    // ── 8. Обновляем app_metadata: org_id → JWT ────────────────────────────
    await service.auth.admin.updateUserById(user.id, {
      app_metadata: {
        org_id:   orgId,
        is_admin: false,
      },
    }).catch(e => console.warn('[create-trial-oauth] updateUserById:', e))

    console.log('[create-trial-oauth] OK — user:', user.id, 'org:', orgId)

    return NextResponse.json({ ok: true, org_id: orgId }, { status: 201 })

  } catch (err: any) {
    console.error('[create-trial-oauth] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 })
  }
}
