import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { normalizePhoneE164, validatePhone } from '@/lib/validations'

// POST /api/demo/notify-admin
// Called from DemoOrderModal — no auth required (public endpoint)
// Creates a notification for the admin (Amber Solutions owner)
export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json()
    // type: 'order_submitted' | 'abandoned'

    // Бэкенд-валидация телефона + нормализация к E.164
    if (type === 'order_submitted' && data?.phone) {
      if (!validatePhone(data.phone)) {
        return NextResponse.json({ ok: false, error: 'Invalid phone format' }, { status: 400 })
      }
      data.phone = normalizePhoneE164(data.phone)
    }

    const service = createSupabaseServiceClient()

    // Admin = Amber Solutions org owner
    const ADMIN_ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    const { data: ou } = await service
      .from('org_users').select('user_id')
      .eq('org_id', ADMIN_ORG_ID).eq('role', 'owner').single()
    if (!ou?.user_id) return NextResponse.json({ ok: false, error: 'Admin not found' })

    const isAbandoned = type === 'abandoned'
    const name = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Аноним'

    const title = isAbandoned
      ? `⚠️ Клиент не завершил регистрацию`
      : `🛒 Новый заказ: ${name}`

    const body = isAbandoned
      ? `${name} (${data.email || '—'}) открыл форму заказа, но вышел не завершив. Страна: ${data.country || '—'}`
      : [
          `Имя: ${name}`,
          `Email: ${data.email || '—'}`,
          `Телефон: ${data.phone || '—'}`,
          `Страна: ${data.country || '—'}`,
          `Пакет: ${data.plan || '—'}`,
          data.setupType  ? `Setup: ${data.setupType} ₪${data.setupPrice}` : '',
          data.monthlyPrice ? `Ежемесячно: ₪${data.monthlyPrice}` : '',
          data.staffCount > 0 ? `Работники: ${data.staffCount} чел.` : '',
          data.wantsPayments  ? '💳 Запросил платёжную систему' : '',
          data.notes ? `Заметки: ${data.notes}` : '',
        ].filter(Boolean).join('\n')

    await service.from('notifications').insert({
      org_id:   ADMIN_ORG_ID,
      user_id:  ou.user_id,
      type:     `demo_${type}`,
      title,
      body,
      is_read:  false,
      priority: isAbandoned ? 'urgent' : 'high',
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[demo/notify-admin]', err?.message)
    return NextResponse.json({ ok: false, error: err?.message })
  }
}
