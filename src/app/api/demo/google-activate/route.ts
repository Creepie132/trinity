import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/demo/google-activate
 * Идемпотентен: если demo-org уже есть — обновляем метадату и возвращаем org_id.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Читаем body ПЕРВЫМ — до любых async операций
    let body: { user_id?: string; email?: string; name?: string } = {}
    try { body = await request.json() } catch {}

    // 2. Проверяем сессию через cookie
    const supabaseUser = await createClient()
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized — no valid session' }, { status: 401 })
    }

    const service = createSupabaseServiceClient()

    // 3. Ищем существующую demo-org для этого пользователя
    const { data: orgUsers } = await service
      .from('org_users')
      .select('org_id, organizations(id, features, name, subscription_status)')
      .eq('user_id', user.id)

    // Ищем demo-org среди всех org пользователя
    const demoOrgUser = orgUsers?.find((ou: any) => {
      const org = ou.organizations as any
      return org?.features?.is_demo === true || org?.features?.is_demo_public === true
    })

    if (demoOrgUser?.org_id) {
      const orgId = demoOrgUser.org_id
      try {
        await service.auth.admin.updateUserById(user.id, { app_metadata: { org_id: orgId } })
      } catch {}
      try {
        await service.from('user_active_branch').upsert(
          { user_id: user.id, active_org_id: orgId },
          { onConflict: 'user_id' }
        )
      } catch {}
      return NextResponse.json({ org_id: orgId, is_new: false })
    }

    // 4. Создаём новую demo-организацию
    const orgId = crypto.randomUUID()
    const displayName = body.name || user.email?.split('@')[0] || 'Demo'
    const orgName = `${displayName} — Demo`

    const { error: orgError } = await service.from('organizations').insert({
      id: orgId,
      name: orgName,
      plan: 'pro',
      subscription_status: 'demo',
      features: {
        is_demo: true,
        is_demo_public: true,
        client_limit: null,
        whatsapp: true,
        sms: true,
        loyalty: true,
        pipeline: true,
        onboarding_completed: true,
        modules: {
          clients: true, visits: true, payments: true, analytics: true,
          inventory: true, subscriptions: true, booking: false,
          diary: true, sales: true, branches: false,
        },
        business_info: {
          owner_name: displayName,
          display_name: orgName,
        },
      },
    })

    if (orgError) {
      console.error('[google-activate] org insert:', orgError)
      return NextResponse.json({ error: 'Failed to create org: ' + orgError.message }, { status: 500 })
    }

    const email = user.email || `${user.id}@demo.trinity`

    // 5. Привязываем пользователя — upsert во всех таблицах
    try {
      await service.from('org_users').upsert(
        { user_id: user.id, org_id: orgId, email, role: 'owner' },
        { onConflict: 'user_id,org_id' }
      )
    } catch (e) { console.error('[google-activate] org_users upsert:', e) }

    try {
      await service.from('user_active_branch').upsert(
        { user_id: user.id, active_org_id: orgId },
        { onConflict: 'user_id' }
      )
    } catch (e) { console.error('[google-activate] user_active_branch upsert:', e) }

    // 6. Обновляем JWT — org_id в app_metadata
    await service.auth.admin.updateUserById(user.id, {
      app_metadata: { org_id: orgId },
    }).catch(e => console.error('[google-activate] updateUserById:', e))

    // 7. Seed данные — не фатально если упадёт
    const seedResult = await seedDemoData(service, orgId)
    if (!seedResult.ok) {
      console.warn('[google-activate] seed partial failure:', seedResult.error)
    }

    return NextResponse.json({ org_id: orgId, is_new: true })

  } catch (err: any) {
    console.error('[google-activate] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 })
  }
}

// ─── Seed ─────────────────────────────────────────────────────────────────────
async function seedDemoData(service: any, orgId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
    const pick = <T,>(arr: T[]): T => arr[rand(0, arr.length - 1)]
    const daysAgo = (n: number, h = 10) => {
      const d = new Date()
      d.setDate(d.getDate() - n)
      d.setHours(h, [0, 15, 30, 45][rand(0, 3)], 0, 0)
      return d.toISOString()
    }

    const NAMES = [
      ['Анна', 'К.'], ['Марина', 'Ш.'], ['Светлана', 'Б.'], ['Нина', 'В.'],
      ['Елена', 'Р.'], ['Ирина', 'М.'], ['Татьяна', 'Л.'], ['Ольга', 'Н.'],
      ['Алина', 'Д.'], ['Юлия', 'С.'], ['Карина', 'Г.'], ['Диана', 'Е.'],
      ['Алиса', 'П.'], ['Рита', 'З.'], ['Вера', 'Т.'], ['Жанна', 'Х.'],
      ['Лариса', 'Ю.'], ['Галина', 'Ф.'], ['Наталья', 'А.'], ['Тамара', 'И.'],
    ]
    const PHONES = ['050', '052', '054', '058']
    const clientRows = NAMES.map(([fn, ln], i) => ({
      org_id: orgId, first_name: fn, last_name: ln,
      phone: `${pick(PHONES)}-000-${String(1000 + i).slice(1)}`,
      email: null, loyalty_points: rand(0, 350), created_at: daysAgo(rand(20, 120)),
    }))
    const { data: clients, error: cErr } = await service.from('clients').insert(clientRows).select('id')
    if (cErr || !clients?.length) return { ok: false, error: cErr?.message }
    const clientIds = clients.map((c: any) => c.id)

    const SERVICES = ['Стрижка', 'Окрашивание', 'Маникюр', 'Педикюр', 'Укладка', 'Стрижка + укладка', 'Тонирование', 'Ламинирование', 'Кератин']
    const STATUSES = ['completed', 'completed', 'completed', 'scheduled', 'cancelled']
    const PRICES = [150, 180, 220, 280, 350, 450, 600, 650, 780]
    const visitRows = Array.from({ length: 50 }, () => ({
      org_id: orgId, client_id: pick(clientIds), service_type: pick(SERVICES),
      scheduled_at: daysAgo(rand(0, 60), rand(9, 18)),
      duration_minutes: pick([30, 45, 60, 90, 120]),
      price: pick(PRICES), status: pick(STATUSES), notes: '',
    }))
    const { data: visits, error: vErr } = await service.from('visits').insert(visitRows).select('id, client_id, price, scheduled_at, status')
    if (vErr) return { ok: false, error: vErr?.message }

    const METHODS = ['cash', 'card', 'bit', 'card', 'cash']
    const completedVisits = (visits || []).filter((v: any) => v.status === 'completed')
    if (completedVisits.length > 0) {
      const paymentRows = completedVisits.map((v: any) => ({
        org_id: orgId, client_id: v.client_id, visit_id: v.id,
        amount: v.price || 200, status: 'completed',
        payment_method: pick(METHODS), provider: 'manual',
        paid_at: v.scheduled_at, created_at: v.scheduled_at,
      }))
      await service.from('payments').insert(paymentRows).catch(() => {})
    }

    const STAGES = ['new', 'contacted', 'consultation', 'won', 'lost']
    const SOURCES = ['Instagram', 'WhatsApp', 'Google', 'Referral', 'Instagram']
    const dealRows = Array.from({ length: 5 }, (_, i) => ({
      org_id: orgId, client_id: clientIds[i] || pick(clientIds),
      stage: STAGES[i], source: SOURCES[i],
      value: pick([150, 180, 220, 350, 650]), notes: '', created_at: daysAgo(rand(1, 10)),
    }))
    await service.from('deals').insert(dealRows).catch(() => {})

    const productRows = [
      { org_id: orgId, name: 'Шампунь проф.',        sku: 'SHP-001', sell_price: 89,  quantity: 24, min_quantity: 5  },
      { org_id: orgId, name: 'Маска для волос',       sku: 'MSK-001', sell_price: 120, quantity: 18, min_quantity: 3  },
      { org_id: orgId, name: 'Краска для волос',      sku: 'CLR-001', sell_price: 65,  quantity: 40, min_quantity: 10 },
      { org_id: orgId, name: 'Масло аргановое',       sku: 'OIL-001', sell_price: 95,  quantity: 15, min_quantity: 3  },
      { org_id: orgId, name: 'Гель-лак',              sku: 'GEL-001', sell_price: 45,  quantity: 30, min_quantity: 8  },
      { org_id: orgId, name: 'Крем для рук',          sku: 'CRM-001', sell_price: 55,  quantity: 20, min_quantity: 5  },
      { org_id: orgId, name: 'Перчатки нитрил.',      sku: 'GLV-001', sell_price: 30,  quantity: 40, min_quantity: 10 },
      { org_id: orgId, name: 'Дезинфектор',           sku: 'DSF-001', sell_price: 40,  quantity: 2,  min_quantity: 3  },
      { org_id: orgId, name: 'Полотенца одноразовые', sku: 'TWL-001', sell_price: 25,  quantity: 50, min_quantity: 15 },
      { org_id: orgId, name: 'Заколки',               sku: 'CLP-001', sell_price: 15,  quantity: 0,  min_quantity: 5  },
    ]
    await service.from('products').insert(productRows).catch(() => {})

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}
