import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

async function sendSMS(phone: string, message: string) {
  const inforuUrl = 'https://api.inforu.co.il/SendMessageXml.ashx'
  const username = process.env.INFORU_USERNAME
  const password = process.env.INFORU_PASSWORD

  // Skip if credentials not configured
  if (!username || !password) {
    console.warn('INFORU credentials not configured, skipping SMS')
    return false
  }

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<InforuXml>
  <User>
    <Username>${username}</Username>
    <Password>${password}</Password>
  </User>
  <Content Type="sms">
    <Message>${message}</Message>
  </Content>
  <Recipients>
    <PhoneNumber>${phone}</PhoneNumber>
  </Recipients>
  <Settings>
    <Sender>ClientBase</Sender>
  </Settings>
</InforuXml>`

  const response = await fetch(inforuUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body: xml,
  })

  return response.ok
}

export async function GET(request: NextRequest) {
  try {
    // 1. Защита endpoint
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()
    const stats = {
      tomorrowReminders: 0,
      twoHourReminders: 0,
      failed: 0,
    }

    // 2. Найти визиты на ЗАВТРА
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setHours(23, 59, 59, 999)

    const { data: tomorrowVisits } = await supabase
      .from('visits')
      .select(`
        id,
        scheduled_at,
        clients!inner (
          id,
          first_name,
          phone,
          org_id
        ),
        organizations!inner (
          id,
          name,
          features,
          phone
        ),
        services(id, name, name_ru)
      `)
      .gte('scheduled_at', tomorrow.toISOString())
      .lte('scheduled_at', tomorrowEnd.toISOString())
      .eq('status', 'scheduled')

    // Отправить напоминания на завтра
    for (const visit of tomorrowVisits || []) {
      const org = visit.organizations as any
      const client = visit.clients as any

      // Проверить reminders_enabled
      if (org?.features?.reminders_enabled === false) {
        continue
      }

      const time = new Date(visit.scheduled_at).toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
      })

      const message = `שלום ${client.first_name}! תזכורת: יש לך תור מחר ב-${time} ב-${org.name}. לביטול: ${org.phone || ''}`

      const success = await sendSMS(client.phone, message)

      if (success) {
        stats.tomorrowReminders++

        // Логировать
        await logAudit({
          org_id: client.org_id,
          user_id: undefined,
          user_email: 'system',
          action: 'send_sms',
          entity_type: 'reminder_tomorrow',
          entity_id: visit.id,
          new_data: {
            client_name: client.first_name,
            phone: client.phone,
            scheduled_at: visit.scheduled_at,
          },
        })
      } else {
        stats.failed++
      }
    }

    // 3. Найти визиты через 2 ЧАСА
    const twoHoursLater = new Date(now)
    twoHoursLater.setHours(twoHoursLater.getHours() + 2)

    const twoHoursStart = new Date(twoHoursLater)
    twoHoursStart.setMinutes(0, 0, 0)

    const twoHoursEnd = new Date(twoHoursLater)
    twoHoursEnd.setMinutes(59, 59, 999)

    const { data: upcomingVisits } = await supabase
      .from('visits')
      .select(`
        id,
        scheduled_at,
        clients!inner (
          id,
          first_name,
          phone,
          org_id
        ),
        organizations!inner (
          id,
          name,
          features
        ),
        services(id, name, name_ru)
      `)
      .gte('scheduled_at', twoHoursStart.toISOString())
      .lte('scheduled_at', twoHoursEnd.toISOString())
      .eq('status', 'scheduled')

    // Отправить напоминания за 2 часа
    for (const visit of upcomingVisits || []) {
      const org = visit.organizations as any
      const client = visit.clients as any

      // Проверить reminders_enabled
      if (org?.features?.reminders_enabled === false) {
        continue
      }

      const time = new Date(visit.scheduled_at).toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
      })

      const message = `התור שלך ב-${org.name} עוד שעתיים (${time}). מחכים לך!`

      const success = await sendSMS(client.phone, message)

      if (success) {
        stats.twoHourReminders++

        // Логировать
        await logAudit({
          org_id: client.org_id,
          user_id: undefined,
          user_email: 'system',
          action: 'send_sms',
          entity_type: 'reminder_2hours',
          entity_id: visit.id,
          new_data: {
            client_name: client.first_name,
            phone: client.phone,
            scheduled_at: visit.scheduled_at,
          },
        })
      } else {
        stats.failed++
      }
    }

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error: any) {
    console.error('Cron reminders error:', error)
    return NextResponse.json(
      { error: 'Failed to send reminders', details: error.message },
      { status: 500 }
    )
  }
}
