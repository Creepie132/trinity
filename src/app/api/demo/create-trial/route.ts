import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * POST /api/demo/create-trial
 *
 * Body: { first_name, last_name, email?, phone, business_name, language? }
 *
 * Атомарно: Auth user + org (is_trial=true, 14d) + org_users + branch + JWT.
 * Seed — non-blocking.
 * Returns: { email: trialEmail, password } для signInWithPassword на фронте.
 *
 * FIX: org.name = `{business_name} #{phone4}{time4}` — обходит unique constraint.
 * UI показывает features.business_info.display_name (чистое название).
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

    const service    = createSupabaseServiceClient()
    const trialEmail = `trial-${cleanPhone}@trinity-trial.internal`
    const trialPass  = crypto.randomUUID()

    // Уникальное внутреннее имя org (обходит organizations_name_unique)
    const suffix        = `${cleanPhone.slice(-4)}${Date.now().toString().slice(-4)}`
    const uniqueOrgName = `${business_name.trim()} #${suffix}`
    // Публичное имя (что видит пользователь в UI)
    const displayName   = business_name.trim()
    const ownerFullName = `${first_name.trim()} ${last_name.trim()}`

    // ── 1. Auth user ────────────────────────────────────────────────────────
    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email:          trialEmail,
      password:       trialPass,
      email_confirm:  true,
      user_metadata: {
        first_name:    first_name.trim(),
        last_name:     last_name.trim(),
        full_name:     ownerFullName,
        phone:         cleanPhone,
        contact_email: userEmail.trim() || null, // реальный email пользователя (опционально)
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
    const orgId        = crypto.randomUUID()
    const trialExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const { error: orgError } = await service.from('organizations').insert({
      id:              orgId,
      name:            uniqueOrgName,   // уникальное (с суффиксом), хранится в БД
      email:           userEmail.trim() || null,
      phone:           cleanPhone,
      owner_email:     trialEmail,
      owner_name:      ownerFullName,
      owner_phone:     cleanPhone,
      plan:            'pro',
      subscription_status: 'demo',
      is_trial:        true,
      trial_started_at: new Date().toISOString(),
      trial_expires_at: trialExpires,
      billing_status:  'trial',
      features: {
        is_demo: true, is_trial: true, client_limit: null,
        whatsapp: true, sms: true, loyalty: true, pipeline: true,
        onboarding_completed: true, language,
        business_info: {
          owner_name:    ownerFullName,
          display_name:  displayName,   // чистое название для UI
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

    // ── 5. JWT: org_id в app_metadata ────────────────────────────────────────
    await service.auth.admin.updateUserById(user.id, {
      app_metadata: { org_id: orgId },
    }).catch(e => console.warn('[create-trial] updateUserById:', e))

    // ── 6. Seed (non-blocking) ────────────────────────────────────────────────
    void seedDemoData(service, orgId, user.id)

    return NextResponse.json({
      ok:           true,
      org_id:       orgId,
      email:        trialEmail,
      password:     trialPass,
      display_name: displayName,
      trial_expires: trialExpires,
    }, { status: 201 })

  } catch (err: any) {
    console.error('[create-trial] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 })
  }
}

// ─── Seed ─────────────────────────────────────────────────────────────────────
async function seedDemoData(service: any, orgId: string, userId: string) {
  try {
    const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
    const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a
    const ts   = (d: number, h = 10, m = 0) => {
      const dt = new Date(); dt.setDate(dt.getDate() - d); dt.setHours(h, m, 0, 0)
      return dt.toISOString()
    }

    const NAMES: [string, string][] = [
      ['Анна','Коваленко'],['Марина','Шевченко'],['Светлана','Борисова'],
      ['Нина','Васильева'],['Елена','Романова'],['Ирина','Михайлова'],
      ['Татьяна','Лебедева'],['Ольга','Новикова'],['Алина','Дроздова'],
      ['Юлия','Соколова'],['Карина','Григорьева'],['Диана','Егорова'],
      ['Алиса','Павлова'],['Рита','Захарова'],['Вера','Тихонова'],
    ]
    const PFX = ['050','052','054','058']
    const { data: clients } = await service.from('clients').insert(
      NAMES.map(([fn, ln]) => ({
        org_id: orgId, first_name: fn, last_name: ln,
        phone: `${pick(PFX)}-${rand(100,999)}-${rand(1000,9999)}`,
        created_at: ts(rand(5,90)),
      }))
    ).select('id')
    const cIds: string[] = (clients || []).map((c: any) => c.id)
    if (!cIds.length) return

    const SVCS = [
      { name:'Стрижка', price:180 }, { name:'Окрашивание', price:450 },
      { name:'Маникюр', price:220 }, { name:'Укладка', price:150 },
      { name:'Тонирование', price:350 }, { name:'Ламинирование', price:600 },
    ]
    const { data: svcs } = await service.from('services').insert(
      SVCS.map(s => ({ org_id: orgId, name: s.name, name_ru: s.name, price: s.price, is_active: true }))
    ).select('id, name, price')
    const svcList: any[] = svcs || []

    const visitRows = Array.from({ length: 25 }, (_, i) => {
      const svc = pick(svcList.length ? svcList : [{ name:'Стрижка', price:180 }])
      const isToday = i >= 22
      return {
        org_id: orgId, client_id: pick(cIds), service_type: svc.name,
        scheduled_at: isToday ? ts(0, 9+(i-22)*3, 0) : ts(rand(1,40), rand(9,18), pick([0,30])),
        duration_minutes: pick([30,45,60,90]),
        price: svc.price, quantity: 1,
        status: (isToday && i === 24) ? 'scheduled' : 'completed', notes: '',
      }
    })
    const { data: visits } = await service.from('visits').insert(visitRows)
      .select('id, client_id, price, scheduled_at, status')

    const done = (visits || []).filter((v: any) => v.status === 'completed')
    if (done.length) {
      await service.from('payments').insert(done.map((v: any) => ({
        org_id: orgId, client_id: v.client_id, visit_id: v.id,
        amount: v.price, status: 'completed',
        payment_method: pick(['cash','card','bit']),
        provider: 'manual', paid_at: v.scheduled_at,
      }))).catch(() => {})
    }

    await service.from('tasks').insert([
      { org_id: orgId, created_by: userId, is_auto: false, status: 'open', priority: 'high',
        title: 'Позвонить клиенту — подтвердить запись', due_date: new Date().toISOString() },
      { org_id: orgId, created_by: userId, is_auto: false, status: 'open', priority: 'normal',
        title: 'Заказать расходники', due_date: new Date(Date.now() + 86400000).toISOString() },
    ]).catch(() => {})

  } catch (e: any) {
    console.warn('[create-trial] seed error:', e?.message)
  }
}
