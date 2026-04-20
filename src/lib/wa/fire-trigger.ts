/**
 * fireWaTrigger — мгновенная отправка WhatsApp по событийному триггеру.
 *
 * Используется в API endpoints: POST /api/clients, POST /api/visits,
 * PATCH /api/visits/[id]/status (при completed), POST /api/payments/create-link.
 *
 * Fire-and-forget: не бросает ошибку, не блокирует ответ клиенту.
 *
 * Многоязычность:
 *   - Загружает clients.preferred_languages и organizations.primary_language
 *   - Выбирает язык сообщения по правилу:
 *       один язык у клиента       → он
 *       оба языка у клиента       → primary_language орга
 *       язык клиента не в шаблоне → primary_language орга
 *       RU-шаблон пустой          → fallback на HE (message_template)
 */

import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { sendWhatsAppMessage }         from '@/lib/wa/send'
import { logAudit }                    from '@/lib/audit'

export type WaTriggerType =
  | 'client_added'
  | 'visit_created'
  | 'visit_completed'
  | 'payment_link_created'

type Lang = 'he' | 'ru'

interface FireWaTriggerOpts {
  orgId:       string
  triggerType: WaTriggerType
  clientPhone: string
  /** ID клиента — нужен для загрузки preferred_languages. Без него используется primary_language орга. */
  clientId?:   string
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

/**
 * Выбор языка для клиента:
 *   - один preferred_language → он
 *   - оба preferred_languages → primary_language орга (tie-breaker)
 *   - клиента нет / пустой массив → primary_language орга
 */
function pickLanguage(clientLangs: string[] | null | undefined, orgPrimary: Lang): Lang {
  const langs = (clientLangs ?? []).filter(l => l === 'he' || l === 'ru') as Lang[]
  if (langs.length === 0) return orgPrimary
  if (langs.length === 1) return langs[0]
  // оба языка → приоритет орга, если он среди них, иначе первый из массива
  return langs.includes(orgPrimary) ? orgPrimary : langs[0]
}

/**
 * Подстановка переменных + BiDi-фикс (RLM) для WhatsApp.
 * Без RLM строка, начинающаяся с латиницы/кириллицы/эмодзи, ломает RTL-layout иврита.
 */
function applyTemplate(template: string, vars: Record<string, string>): string {
  const hasHebrew = /[\u0590-\u05FF]/.test(template)

  const result = Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val),
    template
  )

  if (!hasHebrew) return result

  const RLM = '\u200F'
  return result
    .split('\n')
    .map(line => {
      const firstStrong = line.match(/[A-Za-zА-Яа-яёЁ\u0590-\u05FF\u0600-\u06FF]/)
      if (!firstStrong) return line
      const code = firstStrong[0].codePointAt(0)!
      const isRtlChar = code >= 0x0590 && code <= 0x06FF
      return isRtlChar ? line : RLM + line
    })
    .join('\n')
}

export async function fireWaTrigger(opts: FireWaTriggerOpts): Promise<void> {
  const { orgId, triggerType, clientPhone, clientId, vars, entityId } = opts

  try {
    const supabase = createSupabaseServiceClient()

    // Загружаем триггер + язык орга одним JOIN-ом
    const [triggerRes, orgRes] = await Promise.all([
      supabase
        .from('wa_trigger_settings')
        .select('is_enabled, message_template, message_template_ru')
        .eq('org_id', orgId)
        .eq('trigger_type', triggerType)
        .maybeSingle(),
      supabase
        .from('organizations')
        .select('primary_language')
        .eq('id', orgId)
        .single(),
    ])

    const trigger = triggerRes.data
    if (!trigger?.is_enabled) return
    if (!trigger.message_template && !trigger.message_template_ru) return

    const orgPrimary: Lang = (orgRes.data?.primary_language === 'ru') ? 'ru' : 'he'

    // Определяем язык клиента (если есть clientId)
    let clientLangs: string[] | null = null
    if (clientId) {
      const { data: cli } = await supabase
        .from('clients')
        .select('preferred_languages')
        .eq('id', clientId)
        .eq('org_id', orgId)
        .maybeSingle()
      clientLangs = cli?.preferred_languages ?? null
    }

    const lang = pickLanguage(clientLangs, orgPrimary)

    // Выбор шаблона с fallback: RU→HE если RU пустой, HE→RU если HE пустой
    const templateHe = trigger.message_template ?? ''
    const templateRu = trigger.message_template_ru ?? ''
    const chosenTemplate =
      lang === 'ru'
        ? (templateRu.trim() || templateHe)
        : (templateHe.trim() || templateRu)

    if (!chosenTemplate) return

    const allVars: Record<string, string> = {
      client_name:  vars.client_name,
      org_name:     vars.org_name,
      date:         vars.date         ?? '',
      time:         vars.time         ?? '',
      service:      vars.service      ?? '',
      amount:       vars.amount       ?? '',
      payment_link: vars.payment_link ?? '',
    }
    const message = applyTemplate(chosenTemplate, allVars)

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
        new_data:    { phone: clientPhone, provider: result.provider, lang },
      })
    } else {
      console.error(`[fireWaTrigger] ${triggerType} failed for org ${orgId}:`, result.error)
    }
  } catch (err) {
    console.error(`[fireWaTrigger] ${triggerType} exception:`, err)
  }
}
