'use client'

import { useModalStore } from '@/store/useModalStore'

// Inline SVG logos — no external dependencies
// Generic credit card icon — used when exact card brand is unknown
const CreditCardIcon = () => (
  <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
    <rect x="1" y="1" width="20" height="14" rx="2" stroke="#6B7280" strokeWidth="1.5" fill="white"/>
    <rect x="1" y="4" width="20" height="3" fill="#D1D5DB"/>
    <rect x="3" y="10" width="5" height="2" rx="0.5" fill="#9CA3AF"/>
    <rect x="10" y="10" width="3" height="2" rx="0.5" fill="#9CA3AF"/>
  </svg>
)

const VisaLogo = () => (
  <svg width="32" height="10" viewBox="0 0 38 12" fill="none">
    <path d="M14 1L11 11H8.5L5 3.5C4.7 2.8 4.5 2.4 3.5 2V1H7.5C8 1 8.5 1.4 8.6 1.9L10.2 8.5L14 1Z" fill="#1A1F71"/>
    <path d="M16 1L13.5 11H16L18.5 1H16Z" fill="#1A1F71"/>
    <path d="M26 1C24.8 1 24 1.5 23.5 2.3L20 11H22.5L23 9.5H26.5L26.8 11H29L26.5 1H26ZM23.6 7.5L24.8 3.8L25.5 7.5H23.6Z" fill="#1A1F71"/>
    <path d="M30 3.5C30.9 3.1 32 2.8 33.2 2.8C34.8 2.8 35.8 3.4 35.8 3.4L36.2 1.2C36.2 1.2 35.2 0.8 33.6 0.8C30 0.8 27.5 2.8 27.5 5.4C27.5 7.3 29 8 30.1 8.5C31.1 9 31.6 9.3 31.6 9.8C31.6 10.6 30.6 11 29.5 11C28.2 11 26.8 10.4 26.3 10.1L25.8 12.3C25.8 12.3 27.1 13 28.8 13C32.5 13 35.2 11 35.2 8.4C35.2 5.8 32.5 5 30 3.5Z" fill="#1A1F71"/>
  </svg>
)

const MastercardLogo = () => (
  <svg width="28" height="18" viewBox="0 0 28 18"><circle cx="10" cy="9" r="8" fill="#EB001B"/><circle cx="18" cy="9" r="8" fill="#F79E1B"/><path d="M14 3a8 8 0 0 1 0 12 8 8 0 0 1 0-12Z" fill="#FF5F00"/></svg>
)

const BitLogo = () => (
  <span style={{ fontWeight: 700, fontSize: 11, color: '#E67E22', letterSpacing: '-0.5px' }}>Bit</span>
)

const ApplePayLogo = () => (
  <svg width="34" height="14" viewBox="0 0 34 14" fill="currentColor">
    <text x="0" y="11" fontSize="8" fontWeight="600" fontFamily="system-ui,-apple-system,sans-serif">Apple Pay</text>
  </svg>
)

const CashIcon = () => (
  <span style={{ fontSize: 16, lineHeight: 1 }}>₪</span>
)


function getMethodIcon(method: string) {
  switch (method) {
    case 'visa': return { icon: <VisaLogo />, bg: 'bg-blue-50 dark:bg-blue-900/20' }
    case 'mastercard': return { icon: <MastercardLogo />, bg: 'bg-orange-50 dark:bg-orange-900/20' }
    case 'credit_card': case 'card': return { icon: <CreditCardIcon />, bg: 'bg-gray-50 dark:bg-gray-800' }
    case 'bit': return { icon: <BitLogo />, bg: 'bg-amber-50 dark:bg-amber-900/20' }
    case 'apple_pay': return { icon: <ApplePayLogo />, bg: 'bg-gray-100 dark:bg-gray-800' }
    case 'cash': return { icon: <CashIcon />, bg: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-bold' }
    default: return { icon: <CreditCardIcon />, bg: 'bg-gray-100 dark:bg-gray-800 text-gray-500' }
  }
}

interface PaymentCardProps {
  payment: {
    id: string
    amount: number
    status: string
    method?: string
    payment_method?: string
    client_name?: string
    clients?: { first_name?: string; last_name?: string; phone?: string }
    client?: { first_name?: string; last_name?: string }
    client_phone?: string
    description?: string
    created_at: string
    paid_at?: string
    transaction_id?: string
    payment_number?: string
    type?: string
    subscription_period_start?: string
  }
  locale: 'he' | 'ru'
  onClick?: (payment: any) => void
}

export function PaymentCard({ payment, locale, onClick }: PaymentCardProps) {
  const { openModal } = useModalStore()

  const handleClick = () => {
    if (onClick) { onClick(payment); return }
    openModal('payment-details', { payment, locale })
  }

  const method = payment.payment_method || payment.method || 'other'
  const { icon, bg } = getMethodIcon(method)

  // Client name
  const clientName =
    payment.client_name ||
    (payment.clients ? `${payment.clients.first_name || ''} ${payment.clients.last_name || ''}`.trim() : null) ||
    (payment.client ? `${payment.client.first_name || ''} ${payment.client.last_name || ''}`.trim() : null) ||
    (locale === 'he' ? 'ללא לקוח' : 'Без клиента')

  // Type tag
  const isRecurring = !!payment.subscription_period_start
  const typeTag = isRecurring
    ? { label: locale === 'he' ? '↻ מנוי' : '↻ Авто', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' }
    : payment.type === 'product'
    ? { label: locale === 'he' ? '🧴 מוצר' : '🧴 Товар', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' }
    : null

  // Status — minimal: just colored text + dot
  const statusDot: Record<string, string> = {
    completed: 'bg-green-500',
    pending: 'bg-amber-400',
    failed: 'bg-red-500',
    refunded: 'bg-gray-400',
    cancelled: 'bg-gray-400',
  }
  const statusText: Record<string, Record<'he' | 'ru', string>> = {
    completed: { he: 'שולם', ru: 'Оплачено' },
    pending: { he: 'ממתין', ru: 'Ожидает' },
    failed: { he: 'נכשל', ru: 'Ошибка' },
    refunded: { he: 'הוחזר', ru: 'Возврат' },
    cancelled: { he: 'בוטל', ru: 'Отменён' },
  }

  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl mb-1.5 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
      style={{ animation: 'pcFadeUp .25s ease-out both' }}
    >
      {/* Method icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
        {icon}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{clientName}</span>
          {typeTag && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${typeTag.cls}`}>
              {typeTag.label}
            </span>
          )}
        </div>
        {/* Date subtle */}
        <p className="text-xs text-gray-400 mt-0.5">
          {payment.paid_at || payment.created_at
            ? new Date(payment.paid_at || payment.created_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'short' })
            : '—'}
        </p>
      </div>

      {/* Amount + status */}
      <div className="text-end flex-shrink-0">
        <p className="font-bold text-sm text-gray-900 dark:text-gray-100">₪{Number(payment.amount).toFixed(2)}</p>
        <div className="flex items-center gap-1 justify-end mt-0.5">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[payment.status] || 'bg-gray-400'}`} />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            {statusText[payment.status]?.[locale] || payment.status}
          </span>
        </div>
      </div>
    </div>
  )
}
