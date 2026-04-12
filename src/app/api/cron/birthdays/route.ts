import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit'
import { sendWhatsAppMessage } from '@/lib/wa/send'

/**
 * Применяет переменные к шаблону с корректной BiDi-обработкой для WhatsApp.
 * RLM (\u200F) перед каждым значением — единственный надёжный способ
 * зафиксировать RTL-направление в WhatsApp при смешанном тексте.
 */
function applyTemplate(template: string, vars: Record<string, string>): string {
  const hasHebrew = /[\u0590-\u05FF]/.test(template)

  if (!hasHebrew) {
    return Object.entries(vars).reduce(
      (msg, [key, val]) => msg.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val),
      template
    )
  }

  const RLM = '\u200F'
  const result = Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
      RLM + val + RLM
    ),
    template
  )
  return RLM + result
}

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

      // Проверить birthday_sms_enabled (старый флаг) или wa_trigger_settings.birthday
      const smsFallback = org?.features?.birthday_sms_enabled === true
      if (!smsFallback) {
        // Проверяем wa_trigger_settings
        const { data: triggerRow } = await supabase
          .from('wa_trigger_settings')
          .select('is_enabled, message_template')
          .eq('org_id', client.org_id)
          .eq('trigger_type', 'birthday')
          .maybeSingle()

        if (!triggerRow?.is_enabled) {
          stats.skipped++
          continue
        }

        // WhatsApp отправка
        const template = triggerRow.message_template || ''
        const message = applyTemplate(template, {
          client_name: client.first_name,
          org_name: org.name,
        })

        const result = await sendWhatsAppMessage({
          orgId: client.org_id,
          to: client.phone,
          message,
          softFail: true,
        })

        if (result.ok) {
          stats.sent++
          await logAudit({
            org_id: client.org_id, user_id: undefined, user_email: 'system',
            action: 'send_wa', entity_type: 'birthday_greeting', entity_id: client.id,
            new_data: { client_name: `${client.first_name} ${client.last_name}`, phone: client.phone, provider: result.provider },
          })
        } else {
          stats.failed++
        }
        continue
      }

      // Старый путь — SMS
      const customMessage = org?.features?.birthday_message
      const defaultMessage = `🎂 ${org.name} מאחלת לך יום הולדת שמח, ${client.first_name}! נשמח לראות אותך!`
      const message = customMessage
        ? customMessage.replace('{first_name}', client.first_name).replace('{org_name}', org.name)
        : defaultMessage

      const success = await sendSMS(client.phone, message)

      if (success) {
        stats.sent++
        await logAudit({
          org_id: client.org_id, user_id: undefined, user_email: 'system',
          action: 'send_sms', entity_type: 'birthday_greeting', entity_id: client.id,
          new_data: { client_name: `${client.first_name} ${client.last_name}`, phone: client.phone, date_of_birth: client.date_of_birth },
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
