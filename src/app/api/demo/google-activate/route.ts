import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/demo/google-activate
 * Идемпотентен: если demo-org уже есть — обновляем метадату и возвращаем org_id.
 */
export async function POST(request: NextRequest) {
  try {
    let body: { user_id?: string; email?: string; name?: string } = {}
    try { body = await request.json() } catch {}

    const supabaseUser = await createClient()
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized — no valid session' }, { status: 401 })
    }

    const service = createSupabaseServiceClient()

    // Ищем существующую demo-org
    const { data: orgUsers } = await service
      .from('org_users')
      .select('org_id, organizations(id, features, name, subscription_status)')
      .eq('user_id', user.id)

    const demoOrgUser = orgUsers?.find((ou: any) => {
      const org = ou.organizations as any
      return org?.features?.is_demo === true || org?.features?.is_demo_public === true
    })

    if (demoOrgUser?.org_id) {
      const orgId = demoOrgUser.org_id
      try { await service.auth.admin.updateUserById(user.id, { app_metadata: { org_id: orgId } }) } catch {}
      try {
        await service.from('user_active_branch').upsert(
          { user_id: user.id, active_org_id: orgId }, { onConflict: 'user_id' }
        )
      } catch {}
      return NextResponse.json({ org_id: orgId, is_new: false })
    }

    // Создаём новую demo-организацию
    const orgId = crypto.randomUUID()
    const displayName = body.name || user.email?.split('@')[0] || 'Demo'
    const orgName = `${displayName} — Demo`

    const { error: orgError } = await service.from('organizations').insert({
      id: orgId, name: orgName, plan: 'pro', subscription_status: 'demo',
      features: {
        is_demo: true, is_demo_public: true, client_limit: null,
        whatsapp: true, sms: true, loyalty: true, pipeline: true, onboarding_completed: true,
        modules: {
          clients: true, visits: true, payments: true, analytics: true,
          inventory: true, subscriptions: true, booking: false,
          diary: true, sales: true, branches: false,
        },
        business_info: { owner_name: displayName, display_name: orgName },
      },
    })
    if (orgError) {
      console.error('[google-activate] org insert:', orgError)
      return NextResponse.json({ error: 'Failed to create org: ' + orgError.message }, { status: 500 })
    }

    const email = user.email || `${user.id}@demo.trinity`

    try {
      await service.from('org_users').upsert(
        { user_id: user.id, org_id: orgId, email, role: 'owner' },
        { onConflict: 'user_id,org_id' }
      )
    } catch (e) { console.error('[google-activate] org_users upsert:', e) }

    try {
      await service.from('user_active_branch').upsert(
        { user_id: user.id, active_org_id: orgId }, { onConflict: 'user_id' }
      )
    } catch (e) { console.error('[google-activate] user_active_branch upsert:', e) }

    await service.auth.admin.updateUserById(user.id, {
      app_metadata: { org_id: orgId },
    }).catch(e => console.error('[google-activate] updateUserById:', e))

    const seedResult = await seedDemoData(service, orgId, user.id)
    if (!seedResult.ok) console.warn('[google-activate] seed partial failure:', seedResult.error)

    return NextResponse.json({ org_id: orgId, is_new: true })

  } catch (err: any) {
    console.error('[google-activate] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 })
  }
}

// ─── Seed ─────────────────────────────────────────────────────────────────────
async function seedDemoData(service: any, orgId: string, userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const rand  = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
    const pick  = <T,>(arr: T[]): T => arr[rand(0, arr.length - 1)]
    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5)

    // Время: n дней назад, hour:minute
    const ts = (daysAgo: number, hour = 10, minute = 0): string => {
      const d = new Date()
      d.setDate(d.getDate() - daysAgo)
      d.setHours(hour, minute, 0, 0)
      return d.toISOString()
    }
    // Только дата (для expenses, sales)
    const dateStr = (daysAgo: number): string => {
      const d = new Date()
      d.setDate(d.getDate() - daysAgo)
      return d.toISOString().slice(0, 10)
    }
    const todayStr = dateStr(0)

    // ── 1. КЛИЕНТЫ (30 штук, реалистичные) ──────────────────────────────────
    const CLIENTS_RU = [
      ['Анна','Коваленко'],['Марина','Шевченко'],['Светлана','Борисова'],['Нина','Васильева'],
      ['Елена','Романова'],['Ирина','Михайлова'],['Татьяна','Лебедева'],['Ольга','Новикова'],
      ['Алина','Дроздова'],['Юлия','Соколова'],['Карина','Григорьева'],['Диана','Егорова'],
      ['Алиса','Павлова'],['Рита','Захарова'],['Вера','Тихонова'],['Жанна','Хмелёва'],
      ['Лариса','Юдина'],['Галина','Федотова'],['Наталья','Андреева'],['Тамара','Ильина'],
      ['Дарья','Орлова'],['Ксения','Морозова'],['Вика','Семёнова'],['Лена','Козлова'],
      ['Таня','Попова'],['Соня','Белова'],['Маша','Зайцева'],['Катя','Воробьёва'],
      ['Полина','Степанова'],['Оля','Никитина'],
    ]
    const PHONES_PREFIX = ['050','052','054','058']
    const clientRows = CLIENTS_RU.map(([fn, ln], i) => ({
      org_id: orgId, first_name: fn, last_name: ln,
      phone: `${pick(PHONES_PREFIX)}-${String(rand(100,999))}-${String(rand(1000,9999))}`,
      email: null,
      loyalty_points: rand(0, 500),
      notes: i % 5 === 0 ? 'VIP клиент' : i % 7 === 0 ? 'Аллергия на краску' : null,
      created_at: ts(rand(10, 180)),
    }))
    const { data: clients, error: cErr } = await service.from('clients').insert(clientRows).select('id, first_name')
    if (cErr || !clients?.length) return { ok: false, error: cErr?.message }
    const clientIds = clients.map((c: any) => c.id)

    // ── 2. УСЛУГИ (для корректных visit_services) ────────────────────────────
    const SERVICE_DEFS = [
      { name: 'Стрижка', price: 180, duration: 45, color: '#3B82F6' },
      { name: 'Окрашивание', price: 450, duration: 120, color: '#8B5CF6' },
      { name: 'Маникюр', price: 220, duration: 60, color: '#EC4899' },
      { name: 'Педикюр', price: 250, duration: 75, color: '#F59E0B' },
      { name: 'Укладка', price: 150, duration: 30, color: '#10B981' },
      { name: 'Стрижка + укладка', price: 280, duration: 60, color: '#06B6D4' },
      { name: 'Тонирование', price: 350, duration: 90, color: '#F97316' },
      { name: 'Ламинирование', price: 600, duration: 120, color: '#6366F1' },
      { name: 'Кератин', price: 780, duration: 180, color: '#14B8A6' },
    ]
    const serviceRows = SERVICE_DEFS.map(s => ({
      org_id: orgId, name: s.name, name_ru: s.name,
      price: s.price, duration_minutes: s.duration, color: s.color, is_active: true,
    }))
    const { data: services } = await service.from('services').insert(serviceRows).select('id, name, price')
    const svcList = services || []


    // ── 3. ВИЗИТЫ — прошлые + СЕГОДНЯ (обязательно!) ────────────────────────
    const STATUSES_PAST = ['completed','completed','completed','completed','cancelled']
    const PAYMENT_METHODS = ['cash','card','bit','card','cash','bit']

    type VisitRow = {
      org_id: string; client_id: string; service_type: string;
      scheduled_at: string; duration_minutes: number; price: number;
      status: string; notes: string; quantity: number;
    }
    const visitRows: VisitRow[] = []

    // 60 визитов за последние 60 дней
    for (let i = 0; i < 60; i++) {
      const svc = pick(svcList.length ? svcList : [{ name: 'Стрижка', price: 180 }])
      visitRows.push({
        org_id: orgId, client_id: pick(clientIds),
        service_type: (svc as any).name,
        scheduled_at: ts(rand(1, 60), rand(9, 19), pick([0, 15, 30, 45])),
        duration_minutes: pick([30, 45, 60, 90, 120]),
        price: (svc as any).price || rand(150, 700),
        status: pick(STATUSES_PAST), notes: '', quantity: 1,
      })
    }

    // СЕГОДНЯ: 4 визита — 3 completed + 1 scheduled (для дашборда)
    const TODAY_VISITS = [
      { hour: 9,  min: 0,  status: 'completed' },
      { hour: 11, min: 0,  status: 'completed' },
      { hour: 13, min: 30, status: 'completed' },
      { hour: 16, min: 0,  status: 'scheduled' },
    ]
    for (const tv of TODAY_VISITS) {
      const svc = pick(svcList.length ? svcList : [{ name: 'Стрижка', price: 180 }])
      visitRows.push({
        org_id: orgId, client_id: pick(clientIds),
        service_type: (svc as any).name,
        scheduled_at: ts(0, tv.hour, tv.min),
        duration_minutes: pick([30, 45, 60, 90]),
        price: (svc as any).price || rand(150, 500),
        status: tv.status, notes: '', quantity: 1,
      })
    }

    const { data: visits, error: vErr } = await service
      .from('visits').insert(visitRows)
      .select('id, client_id, price, scheduled_at, status')
    if (vErr) return { ok: false, error: vErr?.message }

    // ── 4. ПЛАТЕЖИ — все completed визиты ───────────────────────────────────
    const completedVisits = (visits || []).filter((v: any) => v.status === 'completed')
    if (completedVisits.length > 0) {
      const paymentRows = completedVisits.map((v: any) => ({
        org_id: orgId, client_id: v.client_id, visit_id: v.id,
        amount: v.price || 200, status: 'completed',
        payment_method: pick(PAYMENT_METHODS), provider: 'manual',
        paid_at: v.scheduled_at, created_at: v.scheduled_at,
      }))
      await service.from('payments').insert(paymentRows).catch(() => {})
    }


    // ── 5. ПРОДАЖИ (sales + sale_items) ─────────────────────────────────────
    const PRODUCT_DEFS = [
      { name: 'Шампунь профессиональный', sku: 'SHP-001', sell_price: 89,  cost_price: 45, quantity: 24, min_quantity: 5  },
      { name: 'Маска для волос',           sku: 'MSK-001', sell_price: 120, cost_price: 60, quantity: 18, min_quantity: 3  },
      { name: 'Краска для волос',          sku: 'CLR-001', sell_price: 65,  cost_price: 30, quantity: 40, min_quantity: 10 },
      { name: 'Масло аргановое',           sku: 'OIL-001', sell_price: 95,  cost_price: 50, quantity: 15, min_quantity: 3  },
      { name: 'Гель-лак',                  sku: 'GEL-001', sell_price: 45,  cost_price: 20, quantity: 30, min_quantity: 8  },
      { name: 'Крем для рук',              sku: 'CRM-001', sell_price: 55,  cost_price: 25, quantity: 20, min_quantity: 5  },
      { name: 'Перчатки нитриловые',       sku: 'GLV-001', sell_price: 30,  cost_price: 12, quantity: 40, min_quantity: 10 },
      { name: 'Дезинфектор рук',           sku: 'DSF-001', sell_price: 40,  cost_price: 18, quantity: 2,  min_quantity: 3  },
      { name: 'Полотенца одноразовые',     sku: 'TWL-001', sell_price: 25,  cost_price: 10, quantity: 50, min_quantity: 15 },
      { name: 'Заколки декоративные',      sku: 'CLP-001', sell_price: 15,  cost_price: 6,  quantity: 0,  min_quantity: 5  },
    ]
    const { data: products } = await service.from('products').insert(
      PRODUCT_DEFS.map(p => ({ org_id: orgId, ...p }))
    ).select('id, name, sell_price')
    const productList = products || []

    // 20 продаж за последние 30 дней
    for (let i = 0; i < 20; i++) {
      const saleDate = dateStr(rand(0, 30))
      const itemCount = rand(1, 3)
      const saleItems = shuffle(productList).slice(0, itemCount)
      const totalAmount = saleItems.reduce((s: number, p: any) => s + (p.sell_price * rand(1, 3)), 0)
      const saleStatus = i < 17 ? 'paid' : 'new'

      const { data: sale } = await service.from('sales').insert({
        org_id: orgId, client_id: pick(clientIds),
        sale_date: saleDate, total_amount: totalAmount, paid_amount: saleStatus === 'paid' ? totalAmount : 0,
        status: saleStatus, receipt_sent: saleStatus === 'paid',
        created_at: ts(rand(0, 30)),
      }).select('id').single().catch(() => ({ data: null }))

      if (sale?.id) {
        const itemRows = saleItems.map((p: any) => {
          const qty = rand(1, 3)
          return {
            org_id: orgId, sale_id: sale.id,
            product_id: p.id, product_name: p.name,
            quantity: qty, unit_price: p.sell_price, total_price: p.sell_price * qty,
          }
        })
        await service.from('sale_items').insert(itemRows).catch(() => {})
      }
    }

    // ── 6. РАСХОДЫ (expenses) ────────────────────────────────────────────────
    const EXPENSE_DEFS = [
      { vendor: 'L\'Oréal Professional',  category: 'inventory', amount: 1850, daysAgo: 5  },
      { vendor: 'Аренда помещения',        category: 'rent',      amount: 4500, daysAgo: 1  },
      { vendor: 'Wella Professionals',     category: 'inventory', amount: 920,  daysAgo: 12 },
      { vendor: 'Электричество',           category: 'utilities', amount: 380,  daysAgo: 8  },
      { vendor: 'Интернет / Bezeq',        category: 'utilities', amount: 150,  daysAgo: 15 },
      { vendor: 'Реклама Instagram',       category: 'marketing', amount: 600,  daysAgo: 20 },
      { vendor: 'Хозяйственные расходы',   category: 'other',     amount: 280,  daysAgo: 3  },
      { vendor: 'Расходники / перчатки',   category: 'inventory', amount: 430,  daysAgo: 18 },
      { vendor: 'Уборка помещения',        category: 'other',     amount: 200,  daysAgo: 10 },
      { vendor: 'Google Ads',              category: 'marketing', amount: 450,  daysAgo: 25 },
      { vendor: 'Новое кресло',            category: 'equipment', amount: 1200, daysAgo: 30 },
      { vendor: 'Вода / кофе для клиентов',category: 'other',     amount: 180,  daysAgo: 7  },
    ]
    const expenseRows = EXPENSE_DEFS.map(e => ({
      org_id: orgId, vendor: e.vendor, category: e.category,
      amount: e.amount, currency: 'ILS',
      expense_date: dateStr(e.daysAgo),
      description: e.vendor, verified: true,
      created_at: ts(e.daysAgo),
    }))
    await service.from('expenses').insert(expenseRows).catch(() => {})


    // ── 7. ЗАДАЧИ — включая СЕГОДНЯШНИЕ открытые ────────────────────────────
    const TASK_DEFS = [
      // Сегодняшние открытые — отображаются на дашборде
      { title: 'Позвонить Марине Шевченко — подтвердить запись',  priority: 'high',   daysAgo: 0, dueDays: 0, status: 'open'      },
      { title: 'Заказать краску L\'Oréal — заканчивается запас',  priority: 'high',   daysAgo: 0, dueDays: 1, status: 'open'      },
      { title: 'Отправить напоминание клиентам на завтра',        priority: 'normal', daysAgo: 0, dueDays: 0, status: 'open'      },
      // Прошлые выполненные
      { title: 'Обновить прайс-лист на сайте',                   priority: 'normal', daysAgo: 3, dueDays: -2, status: 'completed' },
      { title: 'Купить новые полотенца',                          priority: 'low',    daysAgo: 5, dueDays: -4, status: 'completed' },
      { title: 'Проверить запись на следующую неделю',            priority: 'normal', daysAgo: 7, dueDays: -5, status: 'completed' },
      { title: 'Сделать фото работ для Instagram',                priority: 'low',    daysAgo: 10, dueDays: -7, status: 'completed'},
      { title: 'Настроить автоматические напоминания',            priority: 'high',   daysAgo: 2, dueDays: 2,  status: 'open'      },
    ]
    const taskRows = TASK_DEFS.map(t => {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + t.dueDays)
      return {
        org_id: orgId, created_by: userId,
        title: t.title, priority: t.priority, status: t.status,
        due_date: dueDate.toISOString(),
        completed_at: t.status === 'completed' ? ts(t.daysAgo) : null,
        created_at: ts(t.daysAgo),
        is_auto: false,
      }
    })
    await service.from('tasks').insert(taskRows).catch(() => {})

    // ── 8. ДНЕВНИК — work_shifts (смены) ────────────────────────────────────
    const shiftRows = []
    for (let i = 1; i <= 20; i++) {
      const startHour = 9
      const endHour = rand(16, 20)
      shiftRows.push({
        org_id: orgId, user_id: userId,
        started_at: ts(i, startHour, 0),
        ended_at: ts(i, endHour, 0),
        notes: i % 4 === 0 ? 'Загруженный день' : i % 6 === 0 ? 'Сокращённый день' : null,
        created_at: ts(i),
      })
    }
    // Сегодняшняя смена — открытая (нет ended_at)
    shiftRows.push({
      org_id: orgId, user_id: userId,
      started_at: ts(0, 9, 0),
      ended_at: null,
      notes: 'Текущая смена',
      created_at: ts(0),
    })
    await service.from('work_shifts').insert(shiftRows).catch(() => {})

    // ── 9. СДЕЛКИ CRM pipeline ───────────────────────────────────────────────
    const STAGES_LIST = ['new','contacted','consultation','won','lost']
    const SOURCES_LIST = ['Instagram','WhatsApp','Google','Referral','Instagram','TikTok']
    const dealRows = Array.from({ length: 12 }, (_, i) => ({
      org_id: orgId, client_id: clientIds[i % clientIds.length],
      stage: i < 4 ? 'new' : i < 7 ? 'contacted' : i < 9 ? 'consultation' : i < 11 ? 'won' : 'lost',
      source: pick(SOURCES_LIST),
      value: pick([150, 180, 220, 350, 450, 650, 780]),
      notes: i % 3 === 0 ? 'Заинтересована в долгосрочном сотрудничестве' : '',
      created_at: ts(rand(1, 30)),
    }))
    await service.from('deals').insert(dealRows).catch(() => {})

    // ── 10. ЛОЯЛЬНОСТЬ (loyalty_points) ─────────────────────────────────────
    const loyaltyRows = clientIds.slice(0, 15).map((cid: string, i: number) => ({
      org_id: orgId, client_id: cid,
      points: rand(50, 500),
      reason: pick(['visit','referral','birthday_bonus','purchase']),
      created_at: ts(rand(1, 60)),
    }))
    await service.from('loyalty_points').insert(loyaltyRows).catch(() => {})

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}
