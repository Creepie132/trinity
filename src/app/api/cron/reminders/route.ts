import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit'
import { resend, getEmailHeaders, getEmailTags } from '@/lib/resend'
import { reminderEmail } from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

const sendSMS = async (phone: string, message: string) => {
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
        service_type,
        clients!inner (
          id,
          first_name,
          name,
          email,
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
      const service = visit.services as any

      // Проверить reminders_enabled
      if (org?.features?.reminders_enabled === false) {
        continue
      }

      const time = new Date(visit.scheduled_at).toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
      })

      const date = new Date(visit.scheduled_at).toLocaleDateString('he-IL')

      // SMS reminder
      const smsMessage = `שלום ${client.first_name}! תזכורת: יש לך תור מחר ב-${time} ב-${org.name}. לביטול: ${org.phone || ''}`
      const smsSuccess = await sendSMS(client.phone, smsMessage)

      // Email reminder
      let emailSuccess = false
      if (client.email) {
        try {
          const serviceName = service?.name || visit.service_type || 'Услуга | שירות'
          
          await resend.emails.send({
            from: 'Trinity CRM <notifications@ambersol.co.il>',
            to: client.email,
            subject: `⏰ תזכורת לתור מחר | Напоминание о записи - ${org.name}`,
            headers: getEmailHeaders(),
            tags: getEmailTags('transactional'),
            html: reminderEmail(
              client.name || client.first_name,
              date,
              time,
              serviceName,
              org.name
            ),
          })
          
          emailSuccess = true
          console.log(`[Cron Reminders] Email reminder sent for visit ${visit.id} to ${client.email}`)
        } catch (emailError) {
          console.error(`[Cron Reminders] Failed to send email for visit ${visit.id}:`, emailError)
        }
      }

      if (smsSuccess || emailSuccess) {
        stats.tomorrowReminders++

        // Логировать
        await logAudit({
          org_id: client.org_id,
          user_id: undefined,
          user_email: 'system',
          action: 'send_reminder',
          entity_type: 'reminder_tomorrow',
          entity_id: visit.id,
          new_data: {
            client_name: client.first_name,
            phone: client.phone,
            email: client.email,
            scheduled_at: visit.scheduled_at,
            sms_sent: smsSuccess,
            email_sent: emailSuccess,
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
