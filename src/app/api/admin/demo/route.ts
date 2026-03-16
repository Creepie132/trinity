import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { getAuthContext } from '@/lib/auth-helpers'

function generatePassword(): string {
  const words = ['Rose','Star','Moon','Blue','Gold','Fire','Wave','Lion','Sage','Dawn','Jade','Ruby']
  const w1 = words[Math.floor(Math.random() * words.length)]
  const w2 = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(Math.random() * 90) + 10
  return `${w1}${num}${w2}!`
}

function generateEmail(label: string): string {
  // Transliterate basic cyrillic + strip non-ascii
  const translit: Record<string, string> = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z',
    'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
    'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh',
    'щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
  }
  const slug = label.toLowerCase()
    .split('').map(c => translit[c] ?? c).join('')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'demo'
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `demo-${slug}-${rand}@trinity-demo.app`
}

// ─── Bilingual seed data ───────────────────────────────────────────────────────
async function seedDemoData(orgId: string, userId: string, modules: string[], lang: 'he' | 'ru') {
  const s = createSupabaseServiceClient()
  const now = new Date()
  const isHe = lang === 'he'

  // Services — bilingual
  const services = isHe ? [
    { name: 'תספורת נשים',  name_ru: 'Женская стрижка',    price: 180, duration_minutes: 60,  color: '#8B5CF6' },
    { name: 'צביעת שיער',   name_ru: 'Окрашивание волос',  price: 350, duration_minutes: 120, color: '#F59E0B' },
    { name: 'פן ועיצוב',    name_ru: 'Укладка и стайлинг', price: 120, duration_minutes: 45,  color: '#10B981' },
    { name: 'מניקור',       name_ru: 'Маникюр',            price: 90,  duration_minutes: 40,  color: '#EC4899' },
    { name: 'פדיקור',       name_ru: 'Педикюр',            price: 110, duration_minutes: 50,  color: '#06B6D4' },
  ] : [
    { name: 'Женская стрижка',    name_ru: 'Женская стрижка',    price: 180, duration_minutes: 60,  color: '#8B5CF6' },
    { name: 'Окрашивание волос',  name_ru: 'Окрашивание волос',  price: 350, duration_minutes: 120, color: '#F59E0B' },
    { name: 'Укладка и стайлинг', name_ru: 'Укладка и стайлинг', price: 120, duration_minutes: 45,  color: '#10B981' },
    { name: 'Маникюр',           name_ru: 'Маникюр',            price: 90,  duration_minutes: 40,  color: '#EC4899' },
    { name: 'Педикюр',           name_ru: 'Педикюр',            price: 110, duration_minutes: 50,  color: '#06B6D4' },
  ]

  // Clients — bilingual
  const clients = isHe ? [
    { first_name: 'מיכל',  last_name: 'כהן',    phone: '052-1234567', city: 'תל אביב',      loyalty_balance: 120 },
    { first_name: 'שרה',   last_name: 'לוי',    phone: '054-2345678', city: 'ירושלים',      loyalty_balance: 85  },
    { first_name: 'רחל',   last_name: 'גולדברג', phone: '050-3456789', city: 'חיפה',         loyalty_balance: 200 },
    { first_name: 'דינה',  last_name: 'אברהם',  phone: '053-4567890', city: 'אשדוד',        loyalty_balance: 45  },
    { first_name: 'אסתר',  last_name: 'פרץ',    phone: '058-5678901', city: 'באר שבע',      loyalty_balance: 310 },
    { first_name: 'יעל',   last_name: 'בן דוד', phone: '052-6789012', city: 'פתח תקווה',    loyalty_balance: 0   },
    { first_name: 'נועה',  last_name: 'שפירא',  phone: '054-7890123', city: 'ראשון לציון',  loyalty_balance: 160 },
    { first_name: 'תמר',   last_name: 'מזרחי',  phone: '050-8901234', city: 'נתניה',        loyalty_balance: 75  },
  ] : [
    { first_name: 'Анна',      last_name: 'Иванова',    phone: '052-1234567', city: 'Тель-Авив',    loyalty_balance: 120 },
    { first_name: 'Мария',     last_name: 'Петрова',    phone: '054-2345678', city: 'Иерусалим',    loyalty_balance: 85  },
    { first_name: 'Наталья',   last_name: 'Сидорова',   phone: '050-3456789', city: 'Хайфа',        loyalty_balance: 200 },
    { first_name: 'Ирина',     last_name: 'Козлова',    phone: '053-4567890', city: 'Ашдод',        loyalty_balance: 45  },
    { first_name: 'Ольга',     last_name: 'Новикова',   phone: '058-5678901', city: 'Беэр-Шева',    loyalty_balance: 310 },
    { first_name: 'Светлана',  last_name: 'Морозова',   phone: '052-6789012', city: 'Петах-Тиква',  loyalty_balance: 0   },
    { first_name: 'Татьяна',   last_name: 'Волкова',    phone: '054-7890123', city: 'Ришон-ле-Цион', loyalty_balance: 160 },
    { first_name: 'Екатерина', last_name: 'Лебедева',   phone: '050-8901234', city: 'Нетания',      loyalty_balance: 75  },
  ]

  // Products — bilingual
  const products = isHe ? [
    { name: 'שמפו לויטל',        category: 'שמפו',  purchase_price: 45, sell_price: 89,  quantity: 24, min_quantity: 5 },
    { name: 'מרכך אינטנסיבי',    category: 'מרכך',  purchase_price: 38, sell_price: 75,  quantity: 18, min_quantity: 5 },
    { name: 'צבע שיער #4N',      category: 'צבע',   purchase_price: 28, sell_price: 55,  quantity: 3,  min_quantity: 5 },
    { name: 'ספריי קיבוע חזק',   category: 'עיצוב', purchase_price: 22, sell_price: 48,  quantity: 12, min_quantity: 3 },
    { name: 'שמן ארגן',          category: 'טיפול', purchase_price: 65, sell_price: 129, quantity: 8,  min_quantity: 3 },
    { name: 'מסכת שיער פרוטאין', category: 'טיפול', purchase_price: 42, sell_price: 85,  quantity: 2,  min_quantity: 5 },
  ] : [
    { name: 'Шампунь Wella Vital',    category: 'Шампунь',  purchase_price: 45, sell_price: 89,  quantity: 24, min_quantity: 5 },
    { name: 'Интенсивный кондиционер', category: 'Кондиционер', purchase_price: 38, sell_price: 75, quantity: 18, min_quantity: 5 },
    { name: 'Краска для волос #4N',   category: 'Краска',   purchase_price: 28, sell_price: 55,  quantity: 3,  min_quantity: 5 },
    { name: 'Лак сильной фиксации',   category: 'Стайлинг', purchase_price: 22, sell_price: 48,  quantity: 12, min_quantity: 3 },
    { name: 'Масло арганы',           category: 'Уход',     purchase_price: 65, sell_price: 129, quantity: 8,  min_quantity: 3 },
    { name: 'Маска протеиновая',       category: 'Уход',     purchase_price: 42, sell_price: 85,  quantity: 2,  min_quantity: 5 },
  ]

  // Diary tasks — bilingual
  const tasks = isHe ? [
    { title: 'להתקשר למיכל - לאשר תור',         priority: 'high',   status: 'open' },
    { title: 'להזמין מלאי חדש של צבעים',         priority: 'normal', status: 'open' },
    { title: 'לשלוח SMS תזכורות לתורים מחר',     priority: 'urgent', status: 'open' },
    { title: 'חשבונית לרחל לוי - חודש מרץ',      priority: 'normal', status: 'open' },
  ] : [
    { title: 'Позвонить Анне — подтвердить запись', priority: 'high',   status: 'open' },
    { title: 'Заказать новый запас краски',         priority: 'normal', status: 'open' },
    { title: 'Отправить SMS напоминания на завтра', priority: 'urgent', status: 'open' },
    { title: 'Счёт для Марии Петровой — март',      priority: 'normal', status: 'open' },
  ]

  // ── Insert services ────────────────────────────────────────────────────────
  const serviceIds: string[] = []
  if (modules.includes('visits') || modules.includes('clients')) {
    for (const svc of services) {
      const id = crypto.randomUUID()
      serviceIds.push(id)
      await s.from('services').insert({ id, org_id: orgId, ...svc, is_active: true })
    }
  }

  // ── Insert clients ─────────────────────────────────────────────────────────
  const clientIds: string[] = []
  if (modules.includes('clients')) {
    for (const c of clients) {
      const id = crypto.randomUUID()
      clientIds.push(id)
      const dob = new Date(1985 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
      await s.from('clients').insert({
        id, org_id: orgId, ...c,
        date_of_birth: dob.toISOString().split('T')[0],
        created_at: new Date(now.getTime() - Math.random() * 90 * 86400000).toISOString(),
      })
    }
  }

  // ── Insert visits ──────────────────────────────────────────────────────────
  const visitIds: string[] = []
  const visitAmounts: number[] = []
  if (modules.includes('visits') && clientIds.length > 0 && serviceIds.length > 0) {
    // 15 past completed visits (spread in THIS month mostly)
    for (let i = 0; i < 15; i++) {
      const id = crypto.randomUUID()
      // 10 within current month, 5 last month
      const daysAgo = i < 10 ? Math.floor(Math.random() * 14) + 1 : Math.floor(Math.random() * 45) + 15
      const scheduledAt = new Date(now.getTime() - daysAgo * 86400000)
      scheduledAt.setHours(9 + Math.floor(Math.random() * 9), [0,15,30,45][Math.floor(Math.random()*4)], 0, 0)
      const svcIdx = Math.floor(Math.random() * serviceIds.length)
      const svc = services[svcIdx]
      visitIds.push(id)
      visitAmounts.push(svc.price)
      await s.from('visits').insert({
        id, org_id: orgId,
        client_id: clientIds[Math.floor(Math.random() * clientIds.length)],
        service_id: serviceIds[svcIdx],
        service_type: svc.name,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: svc.duration_minutes,
        price: svc.price,
        status: 'completed',
        created_at: scheduledAt.toISOString(),
      })
    }
    // 3 future scheduled visits this week
    for (let i = 1; i <= 3; i++) {
      const id = crypto.randomUUID()
      const scheduledAt = new Date(now.getTime() + i * 86400000)
      scheduledAt.setHours(10 + i, 0, 0, 0)
      const svcIdx = i % serviceIds.length
      await s.from('visits').insert({
        id, org_id: orgId,
        client_id: clientIds[i % clientIds.length],
        service_id: serviceIds[svcIdx],
        service_type: services[svcIdx].name,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: services[svcIdx].duration_minutes,
        price: services[svcIdx].price,
        status: 'scheduled',
        created_at: now.toISOString(),
      })
    }
  }

  // ── Insert payments (always add, even without visits module) ───────────────
  if (modules.includes('payments') && clientIds.length > 0) {
    const methods = ['credit_card', 'cash', 'bit', 'bank_transfer']
    const amounts = [90, 120, 150, 180, 220, 280, 350, 180, 110, 90]
    // 10 payments — 8 in this month, 2 last month
    for (let i = 0; i < 10; i++) {
      const daysAgo = i < 8 ? Math.floor(Math.random() * 13) + 1 : Math.floor(Math.random() * 30) + 15
      const paidDate = new Date(now.getTime() - daysAgo * 86400000)
      paidDate.setHours(10 + Math.floor(Math.random() * 8), 0, 0, 0)
      const svcIdx = i % services.length
      await s.from('payments').insert({
        org_id: orgId,
        client_id: clientIds[i % clientIds.length],
        visit_id: visitIds[i] || null,
        amount: visitAmounts[i] || amounts[i],
        currency: 'ILS',
        status: 'completed',
        payment_method: methods[i % methods.length],
        paid_at: paidDate.toISOString(),
        description: services[svcIdx].name,
        created_at: paidDate.toISOString(),
        type: 'client',
      })
    }
  }

  // ── Insert inventory ───────────────────────────────────────────────────────
  if (modules.includes('inventory')) {
    for (const p of products) {
      await s.from('products').insert({
        org_id: orgId, ...p, is_active: true, unit: isHe ? 'יח׳' : 'шт', brand: 'Wella'
      })
    }
  }

  // ── Insert diary tasks ─────────────────────────────────────────────────────
  if (modules.includes('diary')) {
    for (let i = 0; i < tasks.length; i++) {
      const due = new Date(now.getTime() + i * 86400000)
      due.setHours(10 + i, 0, 0, 0)
      await s.from('tasks').insert({
        org_id: orgId, created_by: userId, ...tasks[i],
        due_date: due.toISOString(), created_at: now.toISOString(),
      })
    }
  }
}

// ─── Route handlers ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  if (auth.user.app_metadata?.is_admin !== true) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { label, hours = 24, modules, lang = 'he' } = await request.json()
  if (!label?.trim()) return NextResponse.json({ error: 'label required' }, { status: 400 })

  try {

  const service = createSupabaseServiceClient()
  const email = generateEmail(label)
  const password = generatePassword()
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString()

  const allModules = ['diary','sales','visits','booking','clients',
                      'branches','payments','analytics','inventory','subscriptions']
  const selectedModules: string[] = modules || ['clients','visits','payments','analytics']
  const modulesFeatures: Record<string, boolean> = {}
  allModules.forEach(k => { modulesFeatures[k] = selectedModules.includes(k) })

  const orgId = crypto.randomUUID()
  const { error: orgError } = await service.from('organizations').insert({
    id: orgId, name: `Demo: ${label}`, plan: 'demo',
    subscription_status: 'demo', subscription_expires_at: expiresAt,
    features: {
      modules: modulesFeatures,
      payments: modulesFeatures.payments, analytics: modulesFeatures.analytics,
      inventory: modulesFeatures.inventory, subscriptions: modulesFeatures.subscriptions,
      sms: false, price_mode: 'auto', client_limit: 50,
      manual_price: 0, monthly_price: 0,
      onboarding_completed: true, is_demo: true, demo_lang: lang,
      business_info: {
        owner_name: label, display_name: `Demo: ${label}`,
        mobile: '', address: '', city: '',
      },
    },
  })
  if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 })

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: label, org_id: orgId },
    app_metadata: { org_id: orgId },
  })
  if (authError || !authData?.user) {
    await service.from('organizations').delete().eq('id', orgId)
    return NextResponse.json({ error: authError?.message || 'user create failed' }, { status: 500 })
  }

  const userId = authData.user.id

  const { error: ouError } = await service.from('org_users').insert({ user_id: userId, org_id: orgId, email, role: 'owner' })
  if (ouError) {
    console.error('[demo/create] org_users insert:', ouError)
    await service.auth.admin.deleteUser(userId)
    await service.from('organizations').delete().eq('id', orgId)
    return NextResponse.json({ error: ouError.message }, { status: 500 })
  }

  const { error: uabError } = await service.from('user_active_branch').insert({ user_id: userId, active_org_id: orgId })
  if (uabError) console.error('[demo/create] user_active_branch:', uabError) // non-fatal

  // Seed demo data with correct language
  try { await seedDemoData(orgId, userId, selectedModules, lang as 'he' | 'ru') }
  catch (e) { console.error('[demo seed]', e) }

  await service.from('demo_sessions').insert({
    label, email, password_plain: password,
    org_id: orgId, user_id: userId, expires_at: expiresAt,
  })

  return NextResponse.json({ email, password, expires_at: expiresAt, org_id: orgId })
  } catch (err: any) {
    console.error('[demo/create] Unexpected error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  if (auth.user.app_metadata?.is_admin !== true) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const service = createSupabaseServiceClient()
  const { data } = await service
    .from('demo_sessions')
    .select('id, label, email, password_plain, expires_at, created_at, is_active, org_id')
    .order('created_at', { ascending: false })
    .limit(50)
  return NextResponse.json(data || [])
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  if (auth.user.app_metadata?.is_admin !== true) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await request.json()
  const service = createSupabaseServiceClient()

  const { data: session } = await service
    .from('demo_sessions').select('user_id, org_id').eq('id', id).single()

  // 1. Delete auth user first (no FK dependency)
  if (session?.user_id) {
    const { error: authErr } = await service.auth.admin.deleteUser(session.user_id)
    if (authErr) console.error('[demo/delete] deleteUser:', authErr.message)
  }

  // 2. Cascade-delete org + ALL related data via SQL function
  //    (simple .delete() fails due to FK constraints)
  if (session?.org_id) {
    const { error: fnErr } = await service.rpc('delete_demo_org', { p_org_id: session.org_id })
    if (fnErr) {
      console.error('[demo/delete] delete_demo_org RPC:', fnErr.message)
      return NextResponse.json({ error: fnErr.message }, { status: 500 })
    }
  } else {
    // Fallback: session record might have already been deleted, clean by id
    await service.from('demo_sessions').delete().eq('id', id)
  }

  return NextResponse.json({ ok: true })
}
