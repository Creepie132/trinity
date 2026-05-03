/**
 * Trinity CRM — Proration utilities
 *
 * Логика:
 *   Upgrade   → клиент доплачивает за оставшиеся дни текущего периода.
 *               Новый тариф стартует СРАЗУ. Списание через Tranzila.
 *   Downgrade → новый тариф применяется со следующего периода.
 *               Возврат не делается (стандарт SaaS).
 *   Same plan → изменение суммы рекуррента без charge.
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
  proratedAmount: number   // сумма к оплате (0 при downgrade)
  nextBillingDate: string  // ISO date
  effectiveDate:  string   // когда вступает в силу (сегодня или nextBillingDate)
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

  // Дней в периоде (считаем от 30 дней назад от periodEnd)
  const periodStart = new Date(effectivePeriodEnd)
  periodStart.setDate(periodStart.getDate() - 30)

  const msLeft = effectivePeriodEnd.getTime() - today.getTime()
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
  const daysInPeriod = 30 // стандарт

  const type: ProrationType =
    newPrice > oldPrice ? 'upgrade' :
    newPrice < oldPrice ? 'downgrade' : 'same'

  // Prorated amount = разница в цене * доля оставшихся дней
  const dailyDiff = (newPrice - oldPrice) / daysInPeriod
  const proratedRaw = type === 'upgrade' ? dailyDiff * daysLeft : 0
  const proratedAmount = Math.max(0, parseFloat(proratedRaw.toFixed(2)))

  const effectiveDate =
    type === 'downgrade'
      ? effectivePeriodEnd.toISOString().split('T')[0]
      : today.toISOString().split('T')[0]

  const nextBillingDate = effectivePeriodEnd.toISOString().split('T')[0]

  const fromLabel = fromPlan.charAt(0).toUpperCase() + fromPlan.slice(1)
  const toLabel = toPlan.charAt(0).toUpperCase() + toPlan.slice(1)

  const messages: Record<ProrationType, { ru: string; he: string }> = {
    upgrade: {
      ru: `Upgrade ${fromLabel} → ${toLabel}. Доплата за ${daysLeft} дней: ₪${proratedAmount}. Следующее списание ${nextBillingDate}: ₪${newPrice}.`,
      he: `שדרוג ${fromLabel} → ${toLabel}. תוספת עבור ${daysLeft} ימים: ₪${proratedAmount}. חיוב הבא ${nextBillingDate}: ₪${newPrice}.`,
    },
    downgrade: {
      ru: `Downgrade ${fromLabel} → ${toLabel}. Текущий период продолжается. Новый тариф ₪${newPrice} вступает с ${effectiveDate}.`,
      he: `הורדת מנוי ${fromLabel} → ${toLabel}. המנוי הנוכחי ממשיך. תעריף חדש ₪${newPrice} יכנס לתוקף מ-${effectiveDate}.`,
    },
    same: {
      ru: `Тариф не изменился. Новая сумма ₪${newPrice} будет списана ${nextBillingDate}.`,
      he: `המנוי לא שונה. הסכום החדש ₪${newPrice} יחויב ב-${nextBillingDate}.`,
    },
  }

  return {
    type,
    fromPlan,
    toPlan,
    fromPrice: oldPrice,
    toPrice: newPrice,
    daysLeft,
    daysInPeriod,
    proratedAmount,
    nextBillingDate,
    effectiveDate,
    message_ru: messages[type].ru,
    message_he: messages[type].he,
  }
}
