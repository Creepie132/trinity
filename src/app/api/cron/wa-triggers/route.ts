/**
 * GET /api/cron/wa-triggers
 * Cron-задача: отправляет WhatsApp-сообщения по активным триггерам:
 *   - after_visit  — через N часов после завершения визита
 *   - after_sale   — через N часов после оплаты
 *   - win_back     — клиентам без визитов N+ дней
 *   - debt_reminder — клиентам с открытым долгом
 *
 * Вызывается раз в час через Vercel Cron.
 * Auth: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/wa/send'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * Применяет переменные к шаблону с корректной BiDi-обработкой для WhatsApp.
 *
 * Проблема: WhatsApp определяет направление каждой строки по первому
 * "сильному" символу. Если строка начинается с латиницы/кириллицы
 * (подставленное значение) — вся строка идёт LTR и иврит ломается.
 *
 * Решение: после замены переменных, каждую строку которая начинается
 * с не-ивритского символа — предваряем RLM (\u200F).
 * RLM сигнализирует WhatsApp: "базовое направление этой строки — RTL".
 */
function applyTemplate(template: string, vars: Record<string, string>): string {
  const hasHebrew = /[\u0590-\u05FF]/.test(template)

  // Сначала подставляем переменные
  const result = Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val),
    template
  )

  if (!hasHebrew) return result

  // Для ивритских шаблонов: добавляем RLM в начало каждой строки
  // которая не начинается с ивритского символа
  const RLM = '\u200F'
  const fixed = result
    .split('\n')
    .map(line => {
      // Находим первый "сильный" символ в строке (пропускаем эмодзи и пробелы)
      const firstStrong = line.match(/[A-Za-zА-Яа-яёЁ\u0590-\u05FF\u0600-\u06FF]/)
      if (!firstStrong) return line // пустая строка или только эмодзи — не трогаем
      const code = firstStrong[0].codePointAt(0)!
      // Если первый сильный символ НЕ иврит/арабский — вставляем RLM
      const isRtlChar = code >= 0x0590 && code <= 0x06FF
      return isRtlChar ? line : RLM + line
    })
    .join('\n')

  return fixed
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const stats = { after_visit: 0, after_sale: 0, win_back: 0, debt_reminder: 0, failed: 0 }

  // ── Загружаем все активные триггеры ────────────────────────────────────────
  const { data: allTriggers } = await supabase
    .from('wa_trigger_settings')
    .select('org_id, trigger_type, message_template, delay_hours, win_back_days')
    .in('trigger_type', ['after_visit', 'after_sale', 'win_back', 'debt_reminder'])
    .eq('is_enabled', true)

  if (!allTriggers?.length) return NextResponse.json({ success: true, stats })

  // Группируем по типу
  type TRow = { org_id: string; trigger_type: string; message_template: string; delay_hours?: number | null; win_back_days?: number | null }
  const byType = (type: string) => (allTriggers as TRow[]).filter(t => t.trigger_type === type)

  // ── after_visit ────────────────────────────────────────────────────────────
  for (const trigger of byType('after_visit')) {
    const delayH = trigger.delay_hours ?? 1
    const windowEnd   = new Date(now.getTime() - delayH * 3600_000)
    const windowStart = new Date(windowEnd.getTime() - 3600_000) // 1-часовое окно

    const { data: visits } = await supabase
      .from('visits')
      .select('id, org_id, service_type, clients!inner(id, first_name, phone), organizations!inner(name), services(name, name_ru)')
      .eq('org_id', trigger.org_id)
      .eq('status', 'completed')
      .gte('updated_at', windowStart.toISOString())
      .lte('updated_at', windowEnd.toISOString())

    for (const visit of visits ?? []) {
      const client  = (visit.clients as any)
      const org     = (visit.organizations as any)
      const service = (visit.services as any)
      const serviceName = service?.name_ru || service?.name || visit.service_type || ''

      const message = applyTemplate(trigger.message_template, {
        client_name: client.first_name, service: serviceName, org_name: org.name,
      })

      const result = await sendWhatsAppMessage({ orgId: trigger.org_id, to: client.phone, message, softFail: true })
      if (result.ok) {
        stats.after_visit++
        await logAudit({ org_id: trigger.org_id, user_id: undefined, user_email: 'system',
          action: 'send_wa', entity_type: 'after_visit', entity_id: visit.id,
          new_data: { client: client.first_name, phone: client.phone, provider: result.provider } })
      } else { stats.failed++; console.error('[wa-triggers] after_visit failed:', result.error) }
    }
  }

  // ── after_sale ─────────────────────────────────────────────────────────────
  for (const trigger of byType('after_sale')) {
    const delayH = trigger.delay_hours ?? 1
    const windowEnd   = new Date(now.getTime() - delayH * 3600_000)
    const windowStart = new Date(windowEnd.getTime() - 3600_000)

    const { data: payments } = await supabase
      .from('payments')
      .select('id, org_id, amount, clients!inner(id, first_name, phone), organizations!inner(name)')
      .eq('org_id', trigger.org_id)
      .eq('status', 'paid')
      .gte('paid_at', windowStart.toISOString())
      .lte('paid_at', windowEnd.toISOString())

    for (const payment of payments ?? []) {
      const client = (payment.clients as any)
      const org    = (payment.organizations as any)

      const message = applyTemplate(trigger.message_template, {
        client_name: client.first_name,
        amount: String(payment.amount ?? ''),
        org_name: org.name,
      })

      const result = await sendWhatsAppMessage({ orgId: trigger.org_id, to: client.phone, message, softFail: true })
      if (result.ok) {
        stats.after_sale++
        await logAudit({ org_id: trigger.org_id, user_id: undefined, user_email: 'system',
          action: 'send_wa', entity_type: 'after_sale', entity_id: payment.id,
          new_data: { client: client.first_name, phone: client.phone, amount: payment.amount } })
      } else { stats.failed++ }
    }
  }

  // ── win_back ───────────────────────────────────────────────────────────────
  for (const trigger of byType('win_back')) {
    const days = trigger.win_back_days ?? 60
    const cutoff = new Date(now.getTime() - days * 86_400_000)

    // Клиенты у которых последний ЗАВЕРШЁННЫЙ визит был до cutoff
    const { data: oldVisitRows } = await supabase
      .from('visits')
      .select('client_id, clients!inner(id, first_name, phone, org_id), organizations!inner(name)')
      .eq('org_id', trigger.org_id)
      .eq('status', 'completed')
      .lt('scheduled_at', cutoff.toISOString())

    if (!oldVisitRows?.length) continue

    // Уникальные клиенты
    const seen = new Set<string>()
    for (const row of oldVisitRows) {
      const client = (row.clients as any)
      if (seen.has(client.id)) continue
      seen.add(client.id)

      // Нет будущих визитов?
      const { count } = await supabase
        .from('visits').select('id', { count: 'exact', head: true })
        .eq('org_id', trigger.org_id).eq('client_id', client.id)
        .gte('scheduled_at', now.toISOString())
        .in('status', ['scheduled', 'confirmed'])
      if ((count ?? 0) > 0) continue

      // Нет недавних визитов после cutoff?
      const { count: recentCount } = await supabase
        .from('visits').select('id', { count: 'exact', head: true })
        .eq('org_id', trigger.org_id).eq('client_id', client.id)
        .gte('scheduled_at', cutoff.toISOString()).eq('status', 'completed')
      if ((recentCount ?? 0) > 0) continue

      const org = (row.organizations as any)
      const message = applyTemplate(trigger.message_template, {
        client_name: client.first_name, org_name: org.name,
      })

      const result = await sendWhatsAppMessage({ orgId: trigger.org_id, to: client.phone, message, softFail: true })
      if (result.ok) {
        stats.win_back++
        await logAudit({ org_id: trigger.org_id, user_id: undefined, user_email: 'system',
          action: 'send_wa', entity_type: 'win_back', entity_id: client.id,
          new_data: { client: client.first_name, phone: client.phone } })
      } else { stats.failed++ }
    }
  }

  // ── debt_reminder ──────────────────────────────────────────────────────────
  for (const trigger of byType('debt_reminder')) {
    // Клиенты у которых есть платёж в статусе partial или unpaid
    const { data: debtPayments } = await supabase
      .from('payments')
      .select('id, client_id, amount, paid_amount, clients!inner(id, first_name, phone), organizations!inner(name)')
      .eq('org_id', trigger.org_id)
      .in('status', ['partial', 'unpaid'])
      .not('client_id', 'is', null)

    if (!debtPayments?.length) continue

    // Агрегируем долг по клиенту
    const debtMap = new Map<string, { client: any; org: any; total: number }>()
    for (const p of debtPayments) {
      const client = (p.clients as any)
      const org    = (p.organizations as any)
      const debt   = (p.amount ?? 0) - (p.paid_amount ?? 0)
      if (debt <= 0) continue
      const existing = debtMap.get(client.id)
      if (existing) existing.total += debt
      else debtMap.set(client.id, { client, org, total: debt })
    }

    for (const { client, org, total } of Array.from(debtMap.values())) {
      const message = applyTemplate(trigger.message_template, {
        client_name: client.first_name,
        amount: total.toFixed(0),
        org_name: org.name,
      })

      const result = await sendWhatsAppMessage({ orgId: trigger.org_id, to: client.phone, message, softFail: true })
      if (result.ok) {
        stats.debt_reminder++
        await logAudit({ org_id: trigger.org_id, user_id: undefined, user_email: 'system',
          action: 'send_wa', entity_type: 'debt_reminder', entity_id: client.id,
          new_data: { client: client.first_name, phone: client.phone, amount: total } })
      } else { stats.failed++ }
    }
  }

  return NextResponse.json({ success: true, stats })
}
