'use client'

import { useModalStore } from '@/store/useModalStore'

// Inline SVG logos — no external dependencies
const VisaLogo = () => (
  <svg width="32" height="10" viewBox="0 0 32 10" fill="none">
    <path d="M12 1L9.5 9H7.5L4.5 3C4.3 2.5 4.1 2.2 3.3 1.8V1H6.5C6.9 1 7.2 1.3 7.3 1.7L8.5 6.5L12 1Z" fill="#1A1F71"/>
    <path d="M13.5 1L11.5 9H13.5L15.5 1H13.5Z" fill="#1A1F71"/>
    <path d="M21 1C20.1 1 19.4 1.4 19 2L16 9H18.2L18.7 7.5H21.5L21.8 9H24L21.5 1H21ZM19.3 6L20.3 3L20.9 6H19.3Z" fill="#1A1F71"/>
    <path d="M25.5 3.2C26.2 2.9 27 2.6 28 2.6C29.3 2.6 30.1 3.1 30.1 3.1L30.5 1.3C30.5 1.3 29.6 1 28.3 1C25.2 1 23 2.7 23 5C23 6.6 24.3 7.2 25.2 7.7C26 8.1 26.4 8.4 26.4 8.8C26.4 9.4 25.6 9.7 24.7 9.7C23.7 9.7 22.6 9.2 22.2 9L21.8 10.8C21.8 10.8 22.9 11.3 24.4 11.3C27.6 11.3 30 9.5 30 7.2C30 4.9 27.5 4.3 25.5 3.2Z" fill="#1A1F71"/>
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
    case 'credit_card': case 'card': case 'visa': return { icon: <VisaLogo />, bg: 'bg-blue-50 dark:bg-blue-900/20' }
    case 'mastercard': return { icon: <MastercardLogo />, bg: 'bg-orange-50 dark:bg-orange-900/20' }
    case 'bit': return { icon: <BitLogo />, bg: 'bg-amber-50 dark:bg-amber-900/20' }
    case 'apple_pay': return { icon: <ApplePayLogo />, bg: 'bg-gray-100 dark:bg-gray-800' }
    case 'cash': return { icon: <CashIcon />, bg: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-bold' }
    default: return { icon: <CashIcon />, bg: 'bg-gray-100 dark:bg-gray-800 text-gray-500' }
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
