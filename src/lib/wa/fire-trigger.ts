/**
 * fireWaTrigger — мгновенная отправка WhatsApp по событийному триггеру.
 *
 * Используется в API endpoints: POST /api/clients, POST /api/visits,
 * PATCH /api/visits/[id]/status (при completed).
 *
 * Fire-and-forget: не бросает ошибку, не блокирует ответ клиенту.
 */

import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { sendWhatsAppMessage }         from '@/lib/wa/send'
import { logAudit }                    from '@/lib/audit'

export type WaTriggerType =
  | 'client_added'
  | 'visit_created'
  | 'visit_completed'
  | 'payment_link_created'

interface FireWaTriggerOpts {
  orgId:       string
  triggerType: WaTriggerType
  clientPhone: string
  vars: {
    client_name:   string
    org_name:      string
    date?:         string
    time?:         string
    service?:      string
    amount?:       string
    payment_link?: string
  }
  entityId?: string
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  const hasHebrew = /[\u0590-\u05FF]/.test(template)

  // Сначала подставляем переменные
  const result = Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val),
    template
  )

  if (!hasHebrew) return result

  // BiDi-фикс для WhatsApp: для ивритских шаблонов добавляем RLM (\u200F)
  // в начало каждой строки, которая начинается с не-ивритского символа.
  // Без этого WhatsApp выстраивает строку как LTR, если она начинается с
  // латиницы/кириллицы (например после подстановки {{client_name}}).
  const RLM = '\u200F'
  return result
    .split('\n')
    .map(line => {
      const firstStrong = line.match(/[A-Za-zА-Яа-яёЁ\u0590-\u05FF\u0600-\u06FF]/)
      if (!firstStrong) return line // пустая строка, только эмодзи/цифры — не трогаем
      const code = firstStrong[0].codePointAt(0)!
      const isRtlChar = code >= 0x0590 && code <= 0x06FF
      return isRtlChar ? line : RLM + line
    })
    .join('\n')
}

export async function fireWaTrigger(opts: FireWaTriggerOpts): Promise<void> {
  const { orgId, triggerType, clientPhone, vars, entityId } = opts

  try {
    const supabase = createSupabaseServiceClient()

    // Проверяем что триггер включён и берём шаблон
    const { data: trigger } = await supabase
      .from('wa_trigger_settings')
      .select('is_enabled, message_template')
      .eq('org_id', orgId)
      .eq('trigger_type', triggerType)
      .maybeSingle()

    if (!trigger?.is_enabled || !trigger.message_template) return

    // Подставляем переменные
    const allVars: Record<string, string> = {
      client_name:  vars.client_name,
      org_name:     vars.org_name,
      date:         vars.date         ?? '',
      time:         vars.time         ?? '',
      service:      vars.service      ?? '',
      amount:       vars.amount       ?? '',
      payment_link: vars.payment_link ?? '',
    }
    const message = applyTemplate(trigger.message_template, allVars)

    // Отправляем
    const result = await sendWhatsAppMessage({
      orgId,
      to: clientPhone,
      message,
      softFail: true,
    })

    if (result.ok) {
      await logAudit({
        org_id:      orgId,
        user_id:     undefined,
        user_email:  'system',
        action:      'send_wa',
        entity_type: triggerType,
        entity_id:   entityId,
        new_data:    { phone: clientPhone, provider: result.provider },
      })
    } else {
      console.error(`[fireWaTrigger] ${triggerType} failed for org ${orgId}:`, result.error)
    }
  } catch (err) {
    // Fire-and-forget — не ломаем основной запрос
    console.error(`[fireWaTrigger] ${triggerType} exception:`, err)
  }
}
