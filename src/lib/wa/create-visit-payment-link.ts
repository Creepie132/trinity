/**
 * createVisitPaymentLink — создаёт платёжную ссылку Tranzila для визита.
 *
 * Используется в fire-and-forget режиме при создании визита, если в настройках
 * WhatsApp-триггера `visit_created` включена опция `attach_payment_link`.
 *
 * Что делает:
 *  1. Создаёт запись в `payments` со статусом 'pending', привязанную к visit_id.
 *  2. Загружает Tranzila-credentials организации (per-org, без fallback на платформу).
 *  3. Генерирует iFrame-ссылку через createTranzilaPaymentLink.
 *  4. Сохраняет ссылку в payments.payment_link.
 *
 * Не бросает исключений — при любой проблеме возвращает null.
 * Вызывающий код должен graceful fallback-ать: подставить пустую строку
 * в {{payment_link}} или вообще пропустить шаблон.
 *
 * SECURITY:
 *  - Использует service client (orgId уже провалидирован вызывающим).
 *  - НЕ использует платформенные ключи как fallback.
 *  - paymentId передаётся в Tranzila через cField1 → webhook tranzila-success
 *    корректно свяжет оплату с payment + visit.
 */

import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { createTranzilaPaymentLink } from '@/lib/tranzila'

interface Opts {
  orgId:       string
  visitId:     string
  clientId:    string
  amount:      number
  description: string
  /** Origin текущего запроса (https://www.ambersol.co.il) — для success/fail URL */
  origin:      string
}

export async function createVisitPaymentLink(
  opts: Opts
): Promise<string | null> {
  const { orgId, visitId, clientId, amount, description, origin } = opts

  if (!amount || amount <= 0) return null

  try {
    const supabase = createSupabaseServiceClient()

    // 1. Загружаем Tranzila credentials организации
    const { data: org } = await supabase
      .from('organizations')
      .select('tranzila_terminal, tranzila_password')
      .eq('id', orgId)
      .single()

    if (!org?.tranzila_terminal) {
      console.warn('[createVisitPaymentLink] org has no tranzila_terminal:', orgId)
      return null
    }

    // 2. Создаём payment со статусом pending
    const { data: payment, error: insertError } = await supabase
      .from('payments')
      .insert([{
        org_id:         orgId,
        client_id:      clientId,
        visit_id:       visitId,
        amount,
        currency:       'ILS',
        status:         'pending',
        provider:       'tranzila',
        payment_method: 'credit_card',
      }])
      .select('id')
      .single()

    if (insertError || !payment) {
      console.error('[createVisitPaymentLink] payments insert error:', insertError)
      return null
    }

    // 3. Генерируем ссылку Tranzila
    const result = await createTranzilaPaymentLink({
      amount,
      description: description || 'תשלום',
      paymentId:   payment.id,
      successUrl:  `${origin}/api/payments/tranzila-success`,
      failUrl:     `${origin}/api/payments/tranzila-failed`,
      terminal:    org.tranzila_terminal,
      password:    org.tranzila_password || undefined,
    })

    // 4. Сохраняем ссылку в payment (для истории / повторной отправки)
    await supabase
      .from('payments')
      .update({ payment_link: result.url })
      .eq('id', payment.id)
      .eq('org_id', orgId)

    return result.url
  } catch (err) {
    console.error('[createVisitPaymentLink] exception:', err)
    return null
  }
}
