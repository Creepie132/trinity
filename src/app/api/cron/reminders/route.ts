import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit'
import { resend, getEmailHeaders, getEmailTags } from '@/lib/resend'
import { reminderEmail } from '@/lib/email-templates'
import { sendWhatsAppMessage } from '@/lib/wa/send'

export const dynamic = 'force-dynamic'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sendSMS = async (phone: string, message: string) => {
  const username = process.env.INFORU_USERNAME
  const password = process.env.INFORU_PASSWORD
  if (!username || !password) { console.warn('[reminders] INFORU not configured'); return false }
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<InforuXml><User><Username>${username}</Username><Password>${password}</Password></User>
<Content Type="sms"><Message>${message}</Message></Content>
<Recipients><PhoneNumber>${phone}</PhoneNumber></Recipients>
<Settings><Sender>Trinity</Sender></Settings></InforuXml>`
  try {
    const res = await fetch('https://api.inforu.co.il/SendMessageXml.ashx', {
      method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: xml,
    })
    return res.ok
  } catch { return false }
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val),
    template
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()
    const stats = { waReminders: 0, smsReminders: 0, emailReminders: 0, failed: 0 }

    // ── 1. Загружаем все активные visit_reminder триггеры ──────────────────
    const { data: triggerRows } = await supabase
      .from('wa_trigger_settings')
      .select('org_id, hours_before, message_template')
      .eq('trigger_type', 'visit_reminder')
      .eq('is_enabled', true)

    const triggerMap = new Map<string, { hours: number; template: string }>()
    for (const row of triggerRows ?? []) {
      triggerMap.set(row.org_id, {
        hours: row.hours_before ?? 24,
        template: row.message_template,
      })
    }

    // ── 2. Для каждого активного триггера — ищем визиты в нужном окне ──────
    const orgIds = Array.from(triggerMap.keys())

    for (const orgId of orgIds) {
      const { hours, template } = triggerMap.get(orgId)!

      const windowStart = new Date(now.getTime() + (hours - 0.5) * 3600_000)
      const windowEnd   = new Date(now.getTime() + (hours + 0.5) * 3600_000)

      const { data: visits } = await supabase
        .from('visits')
        .select(`
          id, scheduled_at, service_type,
          clients!inner(id, first_name, name, email, phone, org_id),
          organizations!inner(id, name, phone),
          services(id, name, name_ru)
        `)
        .eq('org_id', orgId)
        .gte('scheduled_at', windowStart.toISOString())
        .lte('scheduled_at', windowEnd.toISOString())
        .eq('status', 'scheduled')

      for (const visit of visits ?? []) {
        const client  = visit.clients as any
        const org     = visit.organizations as any
        const service = visit.services as any

        const dt   = new Date(visit.scheduled_at)
        const time = dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        const date = dt.toLocaleDateString('he-IL')
        const serviceName = service?.name_ru || service?.name || visit.service_type || ''

        const message = applyTemplate(template, {
          client_name: client.first_name,
          date, time,
          service: serviceName,
          org_name: org.name,
        })

        const result = await sendWhatsAppMessage({ orgId, to: client.phone, message, softFail: true })

        if (result.ok) {
          stats.waReminders++
          await logAudit({
            org_id: orgId, user_id: undefined, user_email: 'system',
            action: 'send_wa', entity_type: 'visit_reminder', entity_id: visit.id,
            new_data: { client_name: client.first_name, phone: client.phone, scheduled_at: visit.scheduled_at, provider: result.provider },
          })
        } else {
          stats.failed++
          console.error(`[reminders] WA failed for visit ${visit.id}:`, result.error)
        }
      }
    }

    // ── 3. Fallback: SMS + Email для org без WA триггера ───────────────────
    // Находим завтрашние визиты для org которых нет в triggerMap
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setHours(23, 59, 59, 999)

    const { data: tomorrowVisits } = await supabase
      .from('visits')
      .select(`
        id, scheduled_at, service_type,
        clients!inner(id, first_name, name, email, phone, org_id),
        organizations!inner(id, name, features, phone),
        services(id, name, name_ru)
      `)
      .gte('scheduled_at', tomorrow.toISOString())
      .lte('scheduled_at', tomorrowEnd.toISOString())
      .eq('status', 'scheduled')

    for (const visit of tomorrowVisits ?? []) {
      const org    = visit.organizations as any
      const client = visit.clients as any

      // Пропускаем если у org уже есть WA триггер (он уже обработан выше)
      if (triggerMap.has(client.org_id)) continue
      if (org?.features?.reminders_enabled === false) continue

      const dt   = new Date(visit.scheduled_at)
      const time = dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      const date = dt.toLocaleDateString('he-IL')

      // SMS
      const smsMsg = `שלום ${client.first_name}! תזכורת: יש לך תור מחר ב-${time} ב-${org.name}. לביטול: ${org.phone || ''}`
      const smsOk  = await sendSMS(client.phone, smsMsg)
      if (smsOk) stats.smsReminders++

      // Email
      if (client.email) {
        try {
          const service = visit.services as any
          const serviceName = service?.name || visit.service_type || ''
          await resend.emails.send({
            from: 'Trinity CRM <notifications@ambersol.co.il>',
            to: client.email,
            subject: `⏰ תזכורת לתור מחר | Напоминание - ${org.name}`,
            headers: getEmailHeaders(), tags: getEmailTags('transactional'),
            html: reminderEmail(client.name || client.first_name, date, time, serviceName, org.name),
          })
          stats.emailReminders++
        } catch (e) { console.error('[reminders] email error:', e) }
      }

      if (smsOk) {
        await logAudit({
          org_id: client.org_id, user_id: undefined, user_email: 'system',
          action: 'send_sms', entity_type: 'visit_reminder', entity_id: visit.id,
          new_data: { client_name: client.first_name, phone: client.phone, scheduled_at: visit.scheduled_at },
        })
      }
    }

    return NextResponse.json({ success: true, stats })
  } catch (error: any) {
    console.error('[reminders] cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
