/**
 * Trinity CRM — Demo Mode Mock Data
 * Все данные обезличены (Data Scrubbing).
 * НИКАКИХ реальных телефонов, имён, сумм из prod-базы.
 */

export const DEMO_ORG_ID = 'demo-org-00000000-0000-0000-0000-000000000001'

// ─── Хелперы дат ──────────────────────────────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString()
}
function todayAt(h: number, m: number): string {
  const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString()
}
function daysAgoAt(days: number, h: number, m: number): string {
  const d = new Date(); d.setDate(d.getDate() - days); d.setHours(h, m, 0, 0); return d.toISOString()
}

// ─── Клиенты ──────────────────────────────────────────────────────────────────
export const MOCK_CLIENTS = [
  { id: 'c1', org_id: DEMO_ORG_ID, first_name: 'Анна',     last_name: 'К.', phone: '050-000-0001', loyalty_points: 120, created_at: daysAgo(45) },
  { id: 'c2', org_id: DEMO_ORG_ID, first_name: 'Марина',   last_name: 'Ш.', phone: '052-000-0002', loyalty_points: 80,  created_at: daysAgo(30) },
  { id: 'c3', org_id: DEMO_ORG_ID, first_name: 'Светлана', last_name: 'Б.', phone: '054-000-0003', loyalty_points: 200, created_at: daysAgo(20) },
  { id: 'c4', org_id: DEMO_ORG_ID, first_name: 'Нина',     last_name: 'В.', phone: '058-000-0004', loyalty_points: 45,  created_at: daysAgo(15) },
  { id: 'c5', org_id: DEMO_ORG_ID, first_name: 'Елена',    last_name: 'Р.', phone: '050-000-0005', loyalty_points: 310, created_at: daysAgo(10) },
  { id: 'c6', org_id: DEMO_ORG_ID, first_name: 'Ирина',    last_name: 'М.', phone: '052-000-0006', loyalty_points: 60,  created_at: daysAgo(7)  },
  { id: 'c7', org_id: DEMO_ORG_ID, first_name: 'Татьяна',  last_name: 'Л.', phone: '054-000-0007', loyalty_points: 150, created_at: daysAgo(5)  },
  { id: 'c8', org_id: DEMO_ORG_ID, first_name: 'Ольга',    last_name: 'Н.', phone: '058-000-0008', loyalty_points: 90,  created_at: daysAgo(3)  },
]

// ─── Визиты ───────────────────────────────────────────────────────────────────
export const MOCK_VISITS = [
  { id: 'v1', org_id: DEMO_ORG_ID, client_id: 'c1', status: 'completed', scheduled_at: todayAt(10, 0),        service_type: 'Стрижка + укладка',     price: 280, duration_minutes: 60,  clientName: 'Анна К.'     },
  { id: 'v2', org_id: DEMO_ORG_ID, client_id: 'c2', status: 'completed', scheduled_at: todayAt(11, 30),       service_type: 'Окрашивание',            price: 650, duration_minutes: 120, clientName: 'Марина Ш.'   },
  { id: 'v3', org_id: DEMO_ORG_ID, client_id: 'c3', status: 'scheduled', scheduled_at: todayAt(14, 0),        service_type: 'Маникюр',                price: 180, duration_minutes: 60,  clientName: 'Светлана Б.' },
  { id: 'v4', org_id: DEMO_ORG_ID, client_id: 'c4', status: 'scheduled', scheduled_at: todayAt(15, 30),       service_type: 'Педикюр',                price: 220, duration_minutes: 75,  clientName: 'Нина В.'     },
  { id: 'v5', org_id: DEMO_ORG_ID, client_id: 'c5', status: 'scheduled', scheduled_at: todayAt(17, 0),        service_type: 'Стрижка',                price: 180, duration_minutes: 45,  clientName: 'Елена Р.'    },
  { id: 'v6', org_id: DEMO_ORG_ID, client_id: 'c7', status: 'completed', scheduled_at: daysAgoAt(1, 14, 0),  service_type: 'Укладка',                price: 150, duration_minutes: 45,  clientName: 'Татьяна Л.'  },
  { id: 'v7', org_id: DEMO_ORG_ID, client_id: 'c8', status: 'completed', scheduled_at: daysAgoAt(2, 10, 0),  service_type: 'Стрижка + окрашивание',  price: 780, duration_minutes: 150, clientName: 'Ольга Н.'    },
]

// ─── Платежи ──────────────────────────────────────────────────────────────────
export const MOCK_PAYMENTS = [
  { id: 'p1', org_id: DEMO_ORG_ID, client_id: 'c1', amount: 280, status: 'completed', paid_at: todayAt(10, 55),        method: 'card' },
  { id: 'p2', org_id: DEMO_ORG_ID, client_id: 'c2', amount: 650, status: 'completed', paid_at: todayAt(13, 30),        method: 'cash' },
  { id: 'p3', org_id: DEMO_ORG_ID, client_id: 'c7', amount: 150, status: 'completed', paid_at: daysAgoAt(1, 14, 45),  method: 'card' },
  { id: 'p4', org_id: DEMO_ORG_ID, client_id: 'c8', amount: 780, status: 'completed', paid_at: daysAgoAt(2, 11, 50),  method: 'card' },
  { id: 'p5', org_id: DEMO_ORG_ID, client_id: 'c5', amount: 180, status: 'completed', paid_at: daysAgoAt(3, 16, 0),   method: 'cash' },
  { id: 'p6', org_id: DEMO_ORG_ID, client_id: 'c3', amount: 180, status: 'completed', paid_at: daysAgoAt(4, 12, 0),   method: 'card' },
  { id: 'p7', org_id: DEMO_ORG_ID, client_id: 'c4', amount: 650, status: 'completed', paid_at: daysAgoAt(5, 15, 0),   method: 'card' },
  { id: 'p8', org_id: DEMO_ORG_ID, client_id: 'c1', amount: 220, status: 'completed', paid_at: daysAgoAt(6, 11, 0),   method: 'cash' },
]

// ─── Dashboard Stats ───────────────────────────────────────────────────────────
export const MOCK_DASHBOARD_STATS = {
  clients:  { value: 8,    change: +12.5 },
  visits:   { value: 34,   change: +8.2  },
  revenue:  { value: 9240, change: +15.7 },
  avgCheck: { value: 272,  change: +3.1  },
}

// ─── Revenue Chart (7 дней) ────────────────────────────────────────────────────
export const MOCK_REVENUE_CHART = [
  { day: 'Вс', amount: 930  },
  { day: 'Пн', amount: 1250 },
  { day: 'Вт', amount: 870  },
  { day: 'Ср', amount: 1640 },
  { day: 'Чт', amount: 1100 },
  { day: 'Пт', amount: 2080 },
  { day: 'Сб', amount: 1370 },
].map((d, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (6 - i))
  return { ...d, date: date.toISOString().slice(0, 10), dateLabel: `${date.getDate()}/${date.getMonth() + 1}` }
})

// ─── Pipeline (лиды) ──────────────────────────────────────────────────────────
export const MOCK_PIPELINE = [
  { id: 'l1', name: 'Алиса Г.',  phone: '050-000-0010', status: 'new',          source: 'Instagram', service: 'Окрашивание', value: 650, created_at: daysAgo(2) },
  { id: 'l2', name: 'Карина Д.', phone: '052-000-0011', status: 'contacted',    source: 'WhatsApp',  service: 'Стрижка',    value: 180, created_at: daysAgo(3) },
  { id: 'l3', name: 'Юлия Ф.',  phone: '054-000-0012', status: 'consultation', source: 'Referral',  service: 'Маникюр',   value: 220, created_at: daysAgo(5) },
  { id: 'l4', name: 'Диана Е.', phone: '058-000-0013', status: 'won',           source: 'Google',    service: 'Укладка',   value: 150, created_at: daysAgo(7) },
  { id: 'l5', name: 'Рита З.',  phone: '050-000-0014', status: 'lost',          source: 'Instagram', service: 'Педикюр',   value: 220, created_at: daysAgo(9) },
]

// ─── Организация ──────────────────────────────────────────────────────────────
export const MOCK_ORGANIZATION = {
  id: DEMO_ORG_ID,
  name: 'Beauty Studio — Demo',
  plan: 'pro',
  subscription_status: 'active',
  features: { client_limit: null, whatsapp: true, sms: true, loyalty: true, pipeline: true },
  created_at: daysAgo(60),
}
