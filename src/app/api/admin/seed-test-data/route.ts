// src/app/api/admin/seed-test-data/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/seed-test-data
 * Fill "Test" organization with realistic test data for screenshots
 * Admin only
 * 
 * Creates:
 * - 25 clients (Israeli names)
 * - 80 visits (with realistic statuses and dates)
 * - 40 payments (various methods)
 * - 13 products (beauty salon inventory)
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin
    const { data: admin } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('[Seed] Admin verified:', user.email)

    // Find "Test" organization
    const { data: testOrg, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('name', 'Test')
      .maybeSingle()

    if (orgError || !testOrg) {
      return NextResponse.json(
        { error: 'Organization "Test" not found' },
        { status: 404 }
      )
    }

    const orgId = testOrg.id
    console.log('[Seed] Found Test organization:', orgId)

    // Israeli names and data
    const clients = [
      { firstName: 'דנה', lastName: 'כהן', note: 'לקוחה קבועה' },
      { firstName: 'יוסי', lastName: 'לוי', note: 'מעדיף תורים בבוקר' },
      { firstName: 'מירב', lastName: 'אברהם', note: '' },
      { firstName: 'אלון', lastName: 'דוד', note: 'VIP' },
      { firstName: 'נועה', lastName: 'פרץ', note: 'אלרגיה לחומרי צבע' },
      { firstName: 'רוני', lastName: 'שמעון', note: '' },
      { firstName: 'תמר', lastName: 'יעקב', note: 'לקוחה קבועה' },
      { firstName: 'אורי', lastName: 'מזרחי', note: '' },
      { firstName: 'שירה', lastName: 'גולדברג', note: 'מעדיפה סטייליסטית מסוימת' },
      { firstName: 'עומר', lastName: 'חיים', note: '' },
      { firstName: 'ליאת', lastName: 'ברק', note: 'VIP' },
      { firstName: 'אייל', lastName: 'רוזן', note: '' },
      { firstName: 'מאיה', lastName: 'שלום', note: 'לקוחה קבועה' },
      { firstName: 'נדב', lastName: 'כץ', note: '' },
      { firstName: 'רותם', lastName: 'פלד', note: 'מעדיף תורים אחר הצהריים' },
      { firstName: 'גל', lastName: 'אריאלי', note: '' },
      { firstName: 'הילה', lastName: 'וולף', note: 'VIP' },
      { firstName: 'עידו', lastName: 'נחמיאס', note: '' },
      { firstName: 'ענבר', lastName: 'סולומון', note: 'אלרגיה לחומרי צבע' },
      { firstName: 'דור', lastName: 'מלכה', note: '' },
      { firstName: 'שני', lastName: 'ביטון', note: 'לקוחה קבועה' },
      { firstName: 'ניר', lastName: 'אוחיון', note: '' },
      { firstName: 'אפרת', lastName: 'טל', note: 'מעדיפה תורים בסופי שבוע' },
      { firstName: 'יונתן', lastName: 'הרוש', note: '' },
      { firstName: 'קרן', lastName: 'זיו', note: 'VIP' },
    ]

    const phonesPrefixes = ['050', '052', '054']
    const serviceTypes = ['תספורת', 'צבע', 'החלקה', 'טיפול פנים', 'מניקור', 'פדיקור', 'תספורת + צבע', 'פגישה']
    const visitNotes = ['', 'שילמה במזומן', 'ביקשה תור חוזר', 'מרוצה מאוד', 'צריך מעקב', 'לקוח חדש', 'תזכורת למוצר']
    const paymentMethods = ['credit_card', 'cash', 'bit', 'stripe', 'bank_transfer']
    const durations = [30, 45, 60, 90]

    // Helper functions
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
    const randomChoice = <T,>(arr: T[]): T => arr[randomInt(0, arr.length - 1)]
    const randomDate = (daysAgo: number) => {
      const date = new Date()
      date.setDate(date.getDate() - randomInt(0, daysAgo))
      date.setHours(randomInt(9, 19), [0, 15, 30, 45][randomInt(0, 3)], 0, 0)
      return date.toISOString()
    }
    const randomPhone = () => {
      const prefix = randomChoice(phonesPrefixes)
      const num = String(randomInt(1000000, 9999999))
      return `${prefix}-${num.slice(0, 3)}-${num.slice(3)}`
    }

    // 1. Create clients
    console.log('[Seed] Creating 25 clients...')
    const clientRecords = clients.map(({ firstName, lastName, note }) => ({
      org_id: orgId,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase().replace(/[^\w]/g, '')}@gmail.com`,
      phone: randomPhone(),
      notes: note,
      created_at: randomDate(180), // Last 6 months
    }))

    const { data: createdClients, error: clientsError } = await supabase
      .from('clients')
      .insert(clientRecords)
      .select('id')

    if (clientsError || !createdClients) {
      console.error('[Seed] Clients error:', clientsError)
      return NextResponse.json(
        { error: 'Failed to create clients', details: clientsError?.message },
        { status: 500 }
      )
    }

    const clientIds = createdClients.map(c => c.id)
    console.log('[Seed] ✅ Created', clientIds.length, 'clients')

    // 2. Create visits (80 visits with proper status distribution)
    console.log('[Seed] Creating 80 visits...')
    const visitRecords = Array.from({ length: 80 }, () => {
      const rand = Math.random()
      let status: 'completed' | 'scheduled' | 'in_progress' | 'cancelled'
      
      if (rand < 0.6) status = 'completed'
      else if (rand < 0.8) status = 'scheduled'
      else if (rand < 0.9) status = 'in_progress'
      else status = 'cancelled'

      const scheduledAt = randomDate(90) // Last 3 months
      
      return {
        org_id: orgId,
        client_id: randomChoice(clientIds),
        service_type: randomChoice(serviceTypes),
        scheduled_at: scheduledAt,
        duration_minutes: randomChoice(durations),
        price: randomInt(80, 500),
        status,
        notes: randomChoice(visitNotes),
        created_at: scheduledAt,
      }
    })

    const { data: createdVisits, error: visitsError } = await supabase
      .from('visits')
      .insert(visitRecords)
      .select('id, client_id, price')

    if (visitsError || !createdVisits) {
      console.error('[Seed] Visits error:', visitsError)
      return NextResponse.json(
        { error: 'Failed to create visits', details: visitsError?.message },
        { status: 500 }
      )
    }

    console.log('[Seed] ✅ Created', createdVisits.length, 'visits')

    // 3. Create payments (40 payments with proper status distribution)
    console.log('[Seed] Creating 40 payments...')
    const selectedVisits = createdVisits.slice(0, 40) // Take 40 visits for payments
    const paymentRecords = selectedVisits.map((visit) => {
      const rand = Math.random()
      let status: 'completed' | 'pending' | 'failed'
      
      if (rand < 0.7) status = 'completed'
      else if (rand < 0.9) status = 'pending'
      else status = 'failed'

      const createdAt = randomDate(90)

      return {
        org_id: orgId,
        client_id: visit.client_id,
        visit_id: visit.id,
        amount: visit.price,
        status,
        payment_method: randomChoice(paymentMethods),
        provider: 'manual',
        created_at: createdAt,
        ...(status === 'completed' && { paid_at: createdAt }),
      }
    })

    const { data: createdPayments, error: paymentsError } = await supabase
      .from('payments')
      .insert(paymentRecords)
      .select('id')

    if (paymentsError || !createdPayments) {
      console.error('[Seed] Payments error:', paymentsError)
      return NextResponse.json(
        { error: 'Failed to create payments', details: paymentsError?.message },
        { status: 500 }
      )
    }

    console.log('[Seed] ✅ Created', createdPayments.length, 'payments')

    // 4. Create products (13 beauty salon products)
    console.log('[Seed] Creating 13 products...')
    const productRecords = [
      {
        org_id: orgId,
        name: 'שמפו מקצועי',
        description: 'Шампунь профессиональный',
        barcode: '7290001234501',
        sku: 'SHP-001',
        category: 'טיפוח שיער',
        sell_price: 89,
        purchase_price: 45,
        quantity: 24,
        min_quantity: 5,
        unit: 'יחידה',
      },
      {
        org_id: orgId,
        name: 'מסכה לשיער',
        description: 'Маска для волос',
        barcode: '7290001234502',
        sku: 'MSK-001',
        category: 'טיפוח שיער',
        sell_price: 120,
        purchase_price: 60,
        quantity: 18,
        min_quantity: 3,
        unit: 'יחידה',
      },
      {
        org_id: orgId,
        name: 'צבע שיער',
        description: 'Краска для волос',
        barcode: '7290001234503',
        sku: 'CLR-001',
        category: 'טיפוח שיער',
        sell_price: 65,
        purchase_price: 30,
        quantity: 40,
        min_quantity: 10,
        unit: 'יחידה',
      },
      {
        org_id: orgId,
        name: 'שמן ארגן',
        description: 'Масло аргановое',
        barcode: '7290001234504',
        sku: 'OIL-001',
        category: 'טיפוח שיער',
        sell_price: 95,
        purchase_price: 50,
        quantity: 15,
        min_quantity: 3,
        unit: 'יחידה',
      },
      {
        org_id: orgId,
        name: 'לק ג\'ל',
        description: 'Гель-лак',
        barcode: '7290001234505',
        sku: 'GEL-001',
        category: 'ציפורניים',
        sell_price: 45,
        purchase_price: 20,
        quantity: 30,
        min_quantity: 8,
        unit: 'יחידה',
      },
      {
        org_id: orgId,
        name: 'קרם ידיים',
        description: 'Крем для рук',
        barcode: '7290001234506',
        sku: 'CRM-001',
        category: 'טיפוח פנים',
        sell_price: 55,
        purchase_price: 25,
        quantity: 20,
        min_quantity: 5,
        unit: 'יחידה',
      },
      {
        org_id: orgId,
        name: 'מברשת שיער',
        description: 'Расчёска',
        barcode: '7290001234507',
        sku: 'BRS-001',
        category: 'מתכלים',
        sell_price: 35,
        purchase_price: 15,
        quantity: 12,
        min_quantity: 3,
        unit: 'יחידה',
      },
      {
        org_id: orgId,
        name: 'סרום לפנים',
        description: 'Сыворотка для лица',
        barcode: '7290001234508',
        sku: 'SER-001',
        category: 'טיפוח פנים',
        sell_price: 150,
        purchase_price: 75,
        quantity: 8,
        min_quantity: 2,
        unit: 'יחידה',
      },
      {
        org_id: orgId,
        name: 'תכשיר החלקה',
        description: 'Средство для выпрямления',
        barcode: '7290001234509',
        sku: 'STR-001',
        category: 'טיפוח שיער',
        sell_price: 180,
        purchase_price: 90,
        quantity: 6,
        min_quantity: 2,
        unit: 'יחידה',
      },
      {
        org_id: orgId,
        name: 'מגבות חד פעמיות',
        description: 'Полотенца одноразовые',
        barcode: '7290001234510',
        sku: 'TWL-001',
        category: 'מתכלים',
        sell_price: 25,
        purchase_price: 12,
        quantity: 50,
        min_quantity: 15,
        unit: 'אריזה',
      },
      {
        org_id: orgId,
        name: 'כפפות ניטריל',
        description: 'Перчатки нитриловые',
        barcode: '7290001234511',
        sku: 'GLV-001',
        category: 'מתכלים',
        sell_price: 30,
        purchase_price: 15,
        quantity: 40,
        min_quantity: 10,
        unit: 'קופסה',
      },
      {
        org_id: orgId,
        name: 'חומר חיטוי',
        description: 'Дезинфектор',
        barcode: '7290001234512',
        sku: 'DSF-001',
        category: 'מתכלים',
        sell_price: 40,
        purchase_price: 18,
        quantity: 2, // LOW STOCK ALERT!
        min_quantity: 3,
        unit: 'בקבוק',
      },
      {
        org_id: orgId,
        name: 'קליפסים לשיער',
        description: 'Заколки',
        barcode: '7290001234513',
        sku: 'CLP-001',
        category: 'מתכלים',
        sell_price: 15,
        purchase_price: 5,
        quantity: 0, // OUT OF STOCK!
        min_quantity: 5,
        unit: 'אריזה',
      },
    ]

    const { data: createdProducts, error: productsError } = await supabase
      .from('products')
      .insert(productRecords)
      .select('id')

    if (productsError || !createdProducts) {
      console.error('[Seed] Products error:', productsError)
      return NextResponse.json(
        { error: 'Failed to create products', details: productsError?.message },
        { status: 500 }
      )
    }

    console.log('[Seed] ✅ Created', createdProducts.length, 'products')

    // Success response
    return NextResponse.json({
      success: true,
      message: 'נתוני בדיקה נוצרו בהצלחה',
      data: {
        organization: testOrg.name,
        org_id: orgId,
        clients: clientIds.length,
        visits: createdVisits.length,
        payments: createdPayments.length,
        products: createdProducts.length,
      },
    })
  } catch (error: any) {
    console.error('[Seed] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
