/**
 * Trinity CRM — Proration utilities
 *
 * Логика:
 *   Upgrade   → клиент доплачивает за оставшиеся дни текущего периода.
 *               Автосписание с tranzila_card_token (если есть), иначе ссылка.
 *               Новый тариф активируется СРАЗУ после подтверждения и оплаты.
 *   Downgrade → кредит за неиспользованные дни (credit note) на следующий месяц.
 *               Применяется как скидка к следующему биллингу.
 *               Новый тариф применяется СРАЗУ.
 *   Same      → просто обновить billing_amount.
 *
 * Клиент ВСЕГДА должен подтвердить смену плана (confirm_token).
 */

export const PLAN_PRICES: Record<string, number> = {
  base:       199,
  pro:        249,
  enterprise: 499,
}

export type ProrationType = 'upgrade' | 'downgrade' | 'same'

export interface ProratePreview {
  type:           ProrationType
  fromPlan:       string
  toPlan:         string
  fromPrice:      number
  toPrice:        number
  daysLeft:       number
  daysInPeriod:   number
  proratedAmount: number   // upgrade: сумма к доплате; downgrade: 0
  creditAmount:   number   // downgrade: кредит на следующий месяц; upgrade: 0
  nextBillingDate: string  // ISO date
  effectiveDate:  string   // когда вступает в силу (всегда сегодня)
  message_ru:     string
  message_he:     string
}

/**
 * Рассчитать prorateAmount.
 *
 * @param fromPlan  текущий план ('base' | 'pro' | 'enterprise' | 'custom')
 * @param toPlan    новый план
 * @param fromPrice кастомная цена (если plan=custom или billing_amount установлен вручную)
 * @param toPrice   кастомная цена нового плана (опционально)
 * @param billingDate дата последнего/следующего списания (ISO)
 */
export function calcProration(
  fromPlan: string,
  toPlan: string,
  billingDate: string,
  fromPrice?: number,
  toPrice?: number,
): ProratePreview {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Цены
  const oldPrice = fromPrice ?? PLAN_PRICES[fromPlan] ?? 199
  const newPrice = toPrice ?? PLAN_PRICES[toPlan] ?? 199

  // Дата конца текущего периода (billing_due_date = когда следующее списание)
  const periodEnd = new Date(billingDate)
  periodEnd.setHours(0, 0, 0, 0)

  // Если billing_date уже прошла — считаем от сегодня + 30 дней
  const effectivePeriodEnd = periodEnd <= today
    ? (() => { const d = new Date(today); d.setDate(d.getDate() + 30); return d })()
    : periodEnd

  const msLeft = effectivePeriodEnd.getTime() - today.getTime()
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
  const daysInPeriod = 30 // стандарт

  const type: ProrationType =
    newPrice > oldPrice ? 'upgrade' :
    newPrice < oldPrice ? 'downgrade' : 'same'

  // Prorated:
  //   upgrade  → доплата за оставшиеся дни = (newPrice - oldPrice) / 30 * daysLeft
  //   downgrade → кредит за оставшиеся дни = (oldPrice - newPrice) / 30 * daysLeft
  const dailyDiff = Math.abs(newPrice - oldPrice) / daysInPeriod
  const proratedRaw = dailyDiff * daysLeft

  const proratedAmount = type === 'upgrade'   ? parseFloat(proratedRaw.toFixed(2)) : 0
  const creditAmount   = type === 'downgrade' ? parseFloat(proratedRaw.toFixed(2)) : 0

  // Новый план вступает в силу СРАЗУ (после подтверждения)
  const effectiveDate = today.toISOString().split('T')[0]
  const nextBillingDate = effectivePeriodEnd.toISOString().split('T')[0]

  const fromLabel = fromPlan.charAt(0).toUpperCase() + fromPlan.slice(1)
  const toLabel = toPlan.charAt(0).toUpperCase() + toPlan.slice(1)

  const messages: Record<ProrationType, { ru: string; he: string }> = {
    upgrade: {
      ru: `Upgrade ${fromLabel} → ${toLabel}. Доплата за ${daysLeft} дней: ₪${proratedAmount}. Следующее списание ${nextBillingDate}: ₪${newPrice}.`,
      he: `שדרוג ${fromLabel} → ${toLabel}. תוספת עבור ${daysLeft} ימים: ₪${proratedAmount}. חיוב הבא ${nextBillingDate}: ₪${newPrice}.`,
    },
    downgrade: {
      ru: `Downgrade ${fromLabel} → ${toLabel}. Кредит за ${daysLeft} дней: ₪${creditAmount} — будет вычтен из следующего счёта (${nextBillingDate}).`,
      he: `הורדת מנוי ${fromLabel} → ${toLabel}. זיכוי עבור ${daysLeft} ימים: ₪${creditAmount} — יקוזז מהחיוב הבא (${nextBillingDate}).`,
    },
    same: {
      ru: `Тариф не изменился. Новая сумма ₪${newPrice} будет списана ${nextBillingDate}.`,
      he: `המנוי לא שונה. הסכום החדש ₪${newPrice} יחויב ב-${nextBillingDate}.`,
    },
  }

  return {
    type, fromPlan, toPlan, fromPrice: oldPrice, toPrice: newPrice,
    daysLeft, daysInPeriod, proratedAmount, creditAmount,
    nextBillingDate, effectiveDate,
    message_ru: messages[type].ru,
    message_he: messages[type].he,
  }
}
