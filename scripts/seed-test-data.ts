/**
 * Script to seed "Test" organization with realistic data for screenshots
 * Usage: npx tsx scripts/seed-test-data.ts
 * 
 * Or use API endpoint: POST /api/admin/seed-test-data
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedTestData() {
  console.log('🌱 Starting seed for Test organization...\n')

  // Find Test organization
  const { data: testOrg, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('name', 'Test')
    .maybeSingle()

  if (orgError || !testOrg) {
    console.error('❌ Organization "Test" not found')
    console.error('Please create an organization named "Test" first')
    process.exit(1)
  }

  const orgId = testOrg.id
  console.log(`✅ Found Test organization: ${orgId}\n`)

  // Israeli names
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
  const serviceTypes = [
    'תספורת',
    'צבע',
    'החלקה',
    'טיפול פנים',
    'מניקור',
    'פדיקור',
    'תספורת + צבע',
    'טיפול שיער',
  ]
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
  console.log('📝 Creating 25 clients...')
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

  if (clientsError) {
    console.error('❌ Error creating clients:', clientsError.message)
    process.exit(1)
  }

  const clientIds = createdClients!.map((c) => c.id)
  console.log(`✅ Created ${clientIds.length} clients\n`)

  // 2. Create visits
  console.log('📝 Creating 80 visits...')
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

  if (visitsError) {
    console.error('❌ Error creating visits:', visitsError.message)
    process.exit(1)
  }

  console.log(`✅ Created ${createdVisits!.length} visits\n`)

  // 3. Create payments
  console.log('📝 Creating 40 payments...')
  const selectedVisits = createdVisits!.slice(0, 40)
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
      created_at: randomDate(90),
      ...(status === 'completed' && { paid_at: randomDate(90) }),
    }
  })

  const { data: createdPayments, error: paymentsError } = await supabase
    .from('payments')
    .insert(paymentRecords)
    .select('id')

  if (paymentsError) {
    console.error('❌ Error creating payments:', paymentsError.message)
    process.exit(1)
  }

  console.log(`✅ Created ${createdPayments!.length} payments\n`)

  // Summary
  console.log('🎉 Seed completed successfully!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Organization: ${testOrg.name}`)
  console.log(`Clients: ${clientIds.length}`)
  console.log(`Visits: ${createdVisits!.length}`)
  console.log(`Payments: ${createdPayments!.length}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

seedTestData()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error)
    process.exit(1)
  })
