import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit'

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

export const dynamic = 'force-dynamic'

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

    const stats = {
      sent: 0,
      failed: 0,
      skipped: 0,
    }

    // 2. Найти клиентов с днём рождения сегодня
    const { data: clients } = await supabase
      .from('clients')
      .select(`
        id,
        first_name,
        last_name,
        phone,
        date_of_birth,
        org_id,
        organizations!inner (
          id,
          name,
          features
        )
      `)
      .not('date_of_birth', 'is', null)

    if (!clients) {
      return NextResponse.json({ success: true, stats, message: 'No clients found' })
    }

    // Фильтровать по дню и месяцу рождения
    const today = new Date()
    const todayMonth = today.getMonth() + 1
    const todayDay = today.getDate()

    const birthdayClients = clients.filter((client) => {
      if (!client.date_of_birth) return false
      const dob = new Date(client.date_of_birth)
      return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay
    })

    // 3. Отправить поздравления
    for (const client of birthdayClients) {
      const org = client.organizations as any

      // Проверить birthday_sms_enabled
      if (org?.features?.birthday_sms_enabled !== true) {
        stats.skipped++
        continue
      }

      // Получить кастомное сообщение или использовать дефолтное
      const customMessage = org?.features?.birthday_message
      const defaultMessage = `🎂 ${org.name} מאחלת לך יום הולדת שמח, ${client.first_name}! נשמח לראות אותך!`
      const message = customMessage
        ? customMessage.replace('{first_name}', client.first_name).replace('{org_name}', org.name)
        : defaultMessage

      const success = await sendSMS(client.phone, message)

      if (success) {
        stats.sent++

        // Логировать
        await logAudit({
          org_id: client.org_id,
          user_id: undefined,
          user_email: 'system',
          action: 'send_sms',
          entity_type: 'birthday_greeting',
          entity_id: client.id,
          new_data: {
            client_name: `${client.first_name} ${client.last_name}`,
            phone: client.phone,
            date_of_birth: client.date_of_birth,
          },
        })
      } else {
        stats.failed++
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      totalBirthdays: birthdayClients.length,
    })
  } catch (error: any) {
    console.error('Birthday cron error:', error)
    return NextResponse.json(
      { error: 'Failed to send birthday greetings', details: error.message },
      { status: 500 }
    )
  }
}
