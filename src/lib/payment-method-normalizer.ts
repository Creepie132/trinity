/**
 * payment-method-normalizer.ts
 *
 * Единственный источник маппинга «сырое значение БД → канонический ключ».
 * Исторически в БД встречаются: 'credit', 'card', 'credit_card', 'transfer',
 * 'cheque', 'bank_transfer', 'bit', 'cash', 'check', 'link' и прочие варианты.
 *
 * Используется:
 *   - methodBreakdown на странице /payments
 *   - UnifiedPaymentDialog (фильтрация по enabled_payment_methods)
 *   - usePaymentMethodConfig hook
 */

export type CanonicalPaymentMethod =
  | 'cash'
  | 'card'
  | 'bit'
  | 'bank_transfer'
  | 'check'
  | 'link'
  | 'other'

/**
 * Приводит любое сырое значение из БД к каноническому ключу.
 * Все неизвестные значения → 'other'.
 */
export function normalizePaymentMethod(raw: string | null | undefined): CanonicalPaymentMethod {
  if (!raw) return 'other'
  const v = raw.toLowerCase().trim()
  if (v === 'cash' || v === 'מזומן') return 'cash'
  if (v === 'card' || v === 'credit' || v === 'credit_card' || v === 'creditcard'
      || v === 'visa' || v === 'mastercard') return 'card'
  if (v === 'bit' || v === 'ביט') return 'bit'
  if (v === 'bank_transfer' || v === 'transfer' || v === 'banktransfer'
      || v === 'העברה' || v === 'העברה בנקאית') return 'bank_transfer'
  if (v === 'check' || v === 'cheque' || v === "צ'ק" || v === 'צ׳ק') return 'check'
  if (v === 'link' || v === 'payment_link' || v === 'paymentlink') return 'link'
  return 'other'
}

export interface MethodVisualConfig {
  color: string
  bg: string
  border: string
  label: { ru: string; he: string }
  icon: string
}

/** Визуальный конфиг для каждого канонического метода */
export const CANONICAL_METHOD_CFG: Record<CanonicalPaymentMethod, MethodVisualConfig> = {
  cash:          { color: '#22c55e', bg: 'rgba(34,197,94,.12)',   border: 'rgba(34,197,94,.3)',   label: { ru: 'Наличные',         he: 'מזומן'        }, icon: '₪'  },
  card:          { color: '#6366f1', bg: 'rgba(99,102,241,.12)',  border: 'rgba(99,102,241,.3)',  label: { ru: 'Кредитная карта',  he: 'כרטיס אשראי'  }, icon: '💳' },
  bit:           { color: '#f97316', bg: 'rgba(249,115,22,.12)',  border: 'rgba(249,115,22,.3)',  label: { ru: 'Bit',              he: 'ביט'          }, icon: '📱' },
  bank_transfer: { color: '#0ea5e9', bg: 'rgba(14,165,233,.12)',  border: 'rgba(14,165,233,.3)',  label: { ru: 'Банковский перевод', he: 'העברה בנקאית' }, icon: '🏦' },
  check:         { color: '#8b5cf6', bg: 'rgba(139,92,246,.12)', border: 'rgba(139,92,246,.3)',  label: { ru: 'Чек',              he: "צ'ק"          }, icon: '📄' },
  link:          { color: '#7c3aed', bg: 'rgba(124,58,237,.12)', border: 'rgba(124,58,237,.3)',  label: { ru: 'Ссылка на оплату', he: 'קישור תשלום'  }, icon: '🔗' },
  other:         { color: '#94a3b8', bg: 'rgba(148,163,184,.12)',border: 'rgba(148,163,184,.3)', label: { ru: 'Прочее',           he: 'אחר'          }, icon: '💰' },
}

/** Хелпер: получить конфиг + канонический ключ для любого сырого значения */
export function getCanonicalMethodCfg(raw: string | null | undefined) {
  const key = normalizePaymentMethod(raw)
  return { key, ...CANONICAL_METHOD_CFG[key] }
}
