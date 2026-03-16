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
  const slug = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 20)
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `demo-${slug}-${rand}@trinity-demo.app`
}

// ─── Seed realistic demo data ──────────────────────────────────────────────────
async function seedDemoData(orgId: string, userId: string, modules: string[]) {
  const s = createSupabaseServiceClient()
  const now = new Date()

  // Always seed services (needed for visits)
  const serviceIds: string[] = []
  const services = [
    { name: 'תספורת נשים', name_ru: 'Женская стрижка', price: 180, duration_minutes: 60, color: '#8B5CF6' },
    { name: 'צביעת שיער', name_ru: 'Окрашивание волос', price: 350, duration_minutes: 120, color: '#F59E0B' },
    { name: 'פן ועיצוב', name_ru: 'Укладка и стайлинг', price: 120, duration_minutes: 45, color: '#10B981' },
    { name: 'מניקור', name_ru: 'Маникюр', price: 90, duration_minutes: 40, color: '#EC4899' },
    { name: 'פדיקור', name_ru: 'Педикюр', price: 110, duration_minutes: 50, color: '#06B6D4' },
  ]
  if (modules.includes('visits') || modules.includes('clients')) {
    for (const svc of services) {
      const id = crypto.randomUUID()
      serviceIds.push(id)
      await s.from('services').insert({ id, org_id: orgId, ...svc, is_active: true })
    }
  }

  // Seed clients
  const clientIds: string[] = []
  if (modules.includes('clients')) {
    const clients = [
      { first_name: 'מיכל', last_name: 'כהן', phone: '052-1234567', city: 'תל אביב', loyalty_balance: 120 },
      { first_name: 'שרה', last_name: 'לוי', phone: '054-2345678', city: 'ירושלים', loyalty_balance: 85 },
      { first_name: 'רחל', last_name: 'גולדברג', phone: '050-3456789', city: 'חיפה', loyalty_balance: 200 },
      { first_name: 'דינה', last_name: 'אברהם', phone: '053-4567890', city: 'אשדוד', loyalty_balance: 45 },
      { first_name: 'אסתר', last_name: 'פרץ', phone: '058-5678901', city: 'באר שבע', loyalty_balance: 310 },
      { first_name: 'יעל', last_name: 'בן דוד', phone: '052-6789012', city: 'פתח תקווה', loyalty_balance: 0 },
      { first_name: 'נועה', last_name: 'שפירא', phone: '054-7890123', city: 'ראשון לציון', loyalty_balance: 160 },
      { first_name: 'תמר', last_name: 'מזרחי', phone: '050-8901234', city: 'נתניה', loyalty_balance: 75 },
    ]
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

  // Seed visits (past + future)
  const visitIds: string[] = []
  if (modules.includes('visits') && clientIds.length > 0 && serviceIds.length > 0) {
    // 20 past completed visits spread over last 60 days
    for (let i = 0; i < 20; i++) {
      const id = crypto.randomUUID()
      visitIds.push(id)
      const daysAgo = Math.floor(Math.random() * 60) + 1
      const scheduledAt = new Date(now.getTime() - daysAgo * 86400000)
      scheduledAt.setHours(9 + Math.floor(Math.random() * 9), [0,15,30,45][Math.floor(Math.random()*4)], 0, 0)
      const svcIdx = Math.floor(Math.random() * serviceIds.length)
      const svc = services[svcIdx]
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
    // 5 future scheduled visits
    for (let i = 1; i <= 5; i++) {
      const id = crypto.randomUUID()
      const scheduledAt = new Date(now.getTime() + i * 86400000)
      scheduledAt.setHours(10 + i, 0, 0, 0)
      const svcIdx = Math.floor(Math.random() * serviceIds.length)
      const svc = services[svcIdx]
      await s.from('visits').insert({
        id, org_id: orgId,
        client_id: clientIds[Math.floor(Math.random() * clientIds.length)],
        service_id: serviceIds[svcIdx],
        service_type: svc.name,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: svc.duration_minutes,
        price: svc.price,
        status: 'scheduled',
        created_at: now.toISOString(),
      })
    }
  }

  // Seed payments linked to completed visits
  if (modules.includes('payments') && visitIds.length > 0 && clientIds.length > 0) {
    const methods = ['credit_card', 'cash', 'bit', 'bank_transfer']
    for (let i = 0; i < Math.min(visitIds.length, 18); i++) {
      const amt = [90,120,150,180,220,280,350][Math.floor(Math.random()*7)]
      const paidDate = new Date(now.getTime() - Math.floor(Math.random() * 55) * 86400000)
      await s.from('payments').insert({
        org_id: orgId,
        client_id: clientIds[Math.floor(Math.random() * clientIds.length)],
        visit_id: visitIds[i] || null,
        amount: amt, currency: 'ILS',
        status: 'completed',
        payment_method: methods[Math.floor(Math.random() * methods.length)],
        paid_at: paidDate.toISOString(),
        description: services[Math.floor(Math.random() * services.length)].name,
        created_at: paidDate.toISOString(),
        type: 'service',
      })
    }
  }

  // Seed inventory products
  if (modules.includes('inventory')) {
    const products = [
      { name: 'שמפו לויטל', category: 'שמפו', purchase_price: 45, sell_price: 89, quantity: 24, min_quantity: 5 },
      { name: 'מרכך אינטנסיבי', category: 'מרכך', purchase_price: 38, sell_price: 75, quantity: 18, min_quantity: 5 },
      { name: 'צבע שיער #4N', category: 'צבע', purchase_price: 28, sell_price: 55, quantity: 3, min_quantity: 5 },
      { name: 'ספריי קיבוע חזק', category: 'עיצוב', purchase_price: 22, sell_price: 48, quantity: 12, min_quantity: 3 },
      { name: 'שמן ארגן', category: 'טיפול', purchase_price: 65, sell_price: 129, quantity: 8, min_quantity: 3 },
      { name: 'מסכת שיער פרוטאין', category: 'טיפול', purchase_price: 42, sell_price: 85, quantity: 2, min_quantity: 5 },
    ]
    for (const p of products) {
      await s.from('products').insert({ org_id: orgId, ...p, is_active: true, unit: 'יח׳', brand: 'Wella' })
    }
  }

  // Seed diary tasks
  if (modules.includes('diary')) {
    const tasks = [
      { title: 'להתקשר ללקוחה מיכל - לאשר תור', priority: 'high', status: 'open' },
      { title: 'להזמין מלאי חדש של צבעים', priority: 'normal', status: 'open' },
      { title: 'לשלוח SMS תזכורות לתורים מחר', priority: 'urgent', status: 'open' },
      { title: 'חשבונית לרחל לוי - חודש מרץ', priority: 'normal', status: 'open' },
    ]
    for (const t of tasks) {
      const due = new Date(now.getTime() + Math.floor(Math.random() * 3) * 86400000)
      due.setHours(10, 0, 0, 0)
      await s.from('tasks').insert({
        org_id: orgId, created_by: userId, ...t,
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

  const { label, hours = 24, modules } = await request.json()
  if (!label?.trim()) return NextResponse.json({ error: 'label required' }, { status: 400 })

  const service = createSupabaseServiceClient()
  const email = generateEmail(label)
  const password = generatePassword()
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString()

  const allModules = ['diary','sales','visits','booking','clients','branches','payments','analytics','inventory','subscriptions']
  const selectedModules: string[] = modules || ['clients','visits','payments','analytics']
  const modulesFeatures: Record<string, boolean> = {}
  allModules.forEach(k => { modulesFeatures[k] = selectedModules.includes(k) })

  const orgId = crypto.randomUUID()
  const { error: orgError } = await service.from('organizations').insert({
    id: orgId, name: `Demo: ${label}`, plan: 'demo',
    subscription_status: 'demo', subscription_expires_at: expiresAt,
    features: {
      modules: modulesFeatures, payments: modulesFeatures.payments,
      analytics: modulesFeatures.analytics, inventory: modulesFeatures.inventory,
      subscriptions: modulesFeatures.subscriptions, sms: false,
      price_mode: 'auto', client_limit: 50, manual_price: 0, monthly_price: 0,
      onboarding_completed: true, is_demo: true,
      business_info: { owner_name: label, display_name: `Demo: ${label}`, mobile: '', address: '', city: '' },
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
  await service.from('org_users').insert({ user_id: userId, org_id: orgId, email, role: 'owner' })
  await service.from('user_active_branch').insert({ user_id: userId, active_org_id: orgId })

  // Seed demo data (non-blocking — if fails, account still works)
  try { await seedDemoData(orgId, userId, selectedModules) } catch (e) { console.error('[demo seed]', e) }

  await service.from('demo_sessions').insert({
    label, email, password_plain: password,
    org_id: orgId, user_id: userId, expires_at: expiresAt,
  })

  return NextResponse.json({ email, password, expires_at: expiresAt, org_id: orgId })
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  if (auth.user.app_metadata?.is_admin !== true) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const service = createSupabaseServiceClient()
  const { data } = await service.from('demo_sessions')
    .select('id, label, email, password_plain, expires_at, created_at, is_active, org_id')
    .order('created_at', { ascending: false }).limit(50)
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
  const { data: session } = await service.from('demo_sessions').select('user_id, org_id').eq('id', id).single()
  if (session?.user_id) await service.auth.admin.deleteUser(session.user_id)
  if (session?.org_id) await service.from('organizations').delete().eq('id', session.org_id)
  await service.from('demo_sessions').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
