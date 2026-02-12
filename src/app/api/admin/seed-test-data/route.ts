// src/app/api/admin/seed-test-data/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/seed-test-data
 * Fill "Test" organization with realistic test data for screenshots
 * Admin only
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 })
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
    const serviceTypes = ['תספורת', 'צבע', 'החלקה', 'טיפול פנים', 'מניקור', 'פדיקור', 'תספורת + צבע', 'טיפול שיער']
    const visitNotes = ['', 'שילמה במזומן', 'ביקשה תור חוזר', 'מרוצה מאוד', 'צריך מעקב']
    const paymentMethods = ['credit_card', 'cash', 'bit', 'stripe']

    // Helper functions
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
    const randomChoice = <T,>(arr: T[]): T => arr[randomInt(0, arr.length - 1)]
    const randomDate = (daysAgo: number) => {
      const date = new Date()
      date.setDate(date.getDate() - randomInt(0, daysAgo))
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
      email: `${firstName.toLowerCase()}@gmail.com`,
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

    // 2. Create visits
    console.log('[Seed] Creating 80 visits...')
    const visitRecords = Array.from({ length: 80 }, () => ({
      org_id: orgId,
      client_id: randomChoice(clientIds),
      service_type: randomChoice(serviceTypes),
      price: randomInt(80, 500),
      notes: randomChoice(visitNotes),
      created_at: randomDate(90), // Last 3 months
    }))

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

    // 3. Create payments (40 payments)
    console.log('[Seed] Creating 40 payments...')
    const selectedVisits = createdVisits.slice(0, 40) // Take 40 visits for payments
    const paymentRecords = selectedVisits.map((visit) => {
      const rand = Math.random()
      let status: 'completed' | 'pending' | 'failed'
      
      if (rand < 0.7) status = 'completed'
      else if (rand < 0.9) status = 'pending'
      else status = 'failed'

      return {
        org_id: orgId,
        client_id: visit.client_id,
        visit_id: visit.id,
        amount: visit.price,
        status,
        payment_method: randomChoice(paymentMethods),
        provider: 'manual',
        created_at: randomDate(90), // Last 3 months
        ...(status === 'completed' && { paid_at: randomDate(90) }),
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
