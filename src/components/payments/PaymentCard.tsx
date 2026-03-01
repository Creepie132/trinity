'use client'

import { CreditCard, Banknote, Receipt } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useModalStore } from '@/store/useModalStore'

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
    transaction_id?: string
    link?: string
    payment_url?: string
    notes?: string
    payment_number?: string
  }
  locale: 'he' | 'ru'
  onRefund?: (payment: any) => void
  onRetry?: (payment: any) => void
  onClick?: (payment: any) => void
}

export function PaymentCard({ payment, locale, onRefund, onRetry, onClick }: PaymentCardProps) {
  const { openModal } = useModalStore()
  
  const handleCardClick = () => {
    if (onClick) {
      onClick(payment)
    } else {
      openModal('payment-details', { payment, locale })
    }
  }

  const t = {
    he: {
      paid: 'שולם',
      pending: 'ממתין',
      failed: 'נכשל',
      refunded: 'הוחזר',
      cancelled: 'בוטל',
      noClient: 'ללא לקוח',
    },
    ru: {
      paid: 'Оплачено',
      pending: 'Ожидает',
      failed: 'Ошибка',
      refunded: 'Возвращено',
      cancelled: 'Отменён',
      noClient: 'Без клиента',
    },
  }

  const text = t[locale]

  // Parse payment info with priority logic
  function parsePaymentInfo(description: string | undefined, payment: any) {
    // Priority 1: payment.clients (Supabase JOIN result)
    if (payment.clients) {
      const clientName = `${payment.clients.first_name || ''} ${payment.clients.last_name || ''}`.trim() || text.noClient
      return {
        clientName,
        subtitle: formatSubtitle(payment, null)
      }
    }

    // Priority 2: payment.client_name or payment.client (legacy/fallback)
    if (payment.client_name || payment.client) {
      const clientName = payment.client_name ||
        (payment.client
          ? `${payment.client.first_name || ''} ${payment.client.last_name || ''}`.trim()
          : text.noClient)
      return {
        clientName,
        subtitle: formatSubtitle(payment, null)
      }
    }

    // Fallback: parse concatenated string "Наличные - Владислав Халфин"
    if (description && description.includes(' - ')) {
      const parts = description.split(' - ')
      const method = parts[0].trim()
      const name = parts.slice(1).join(' - ').trim() // handle dashes in name
      return {
        clientName: name || text.noClient,
        subtitle: formatSubtitle(payment, method)
      }
    }

    return {
      clientName: text.noClient,
      subtitle: formatSubtitle(payment, null)
    }
  }

  function formatSubtitle(payment: any, parsedMethod: string | null) {
    const methodLabels: Record<string, { he: string, ru: string }> = {
      cash: { he: 'מזומן', ru: 'Наличные' },
      card: { he: 'כרטיס', ru: 'Карта' },
      transfer: { he: 'העברה', ru: 'Перевод' },
      bank_transfer: { he: 'העברה', ru: 'Перевод' },
      bit: { he: 'ביט', ru: 'Bit' },
    }

    const method = parsedMethod ||
      (payment.method && methodLabels[payment.method]?.[locale]) ||
      (payment.payment_method && methodLabels[payment.payment_method]?.[locale]) ||
      payment.method ||
      payment.payment_method ||
      ''

    const number = payment.id
      ? `#${payment.id.slice(0, 8)}`
      : (payment.payment_number ? `#${payment.payment_number}` : '')

    return [method, number].filter(Boolean).join(' — ')
  }

  const { clientName, subtitle } = parsePaymentInfo(payment.description, payment)

  const method = payment.method || payment.payment_method || 'other'

  const methodIcon = {
    card: <CreditCard size={18} />,
    cash: <Banknote size={18} />,
    bank_transfer: <Receipt size={18} />,
    transfer: <Receipt size={18} />,
    bit: <Receipt size={18} />,
    other: <Receipt size={18} />,
  }[method] || <Receipt size={18} />

  const methodBg = {
    card: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    cash: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    bank_transfer: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    transfer: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    bit: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    other: 'bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  }[method] || 'bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'

  const methodLabels: Record<string, { he: string, ru: string }> = {
    cash: { he: 'מזומן', ru: 'Наличные' },
    card: { he: 'כרטיס', ru: 'Карта' },
    transfer: { he: 'העברה', ru: 'Перевод' },
    bank_transfer: { he: 'העברה', ru: 'Перевод' },
    bit: { he: 'ביט', ru: 'Bit' },
    other: { he: 'אחר', ru: 'Другое' },
  }

  const methodLabel = methodLabels[method]?.[locale] || text.other

  const statusLabel = {
    completed: text.paid,
    pending: text.pending,
    failed: text.failed,
    refunded: text.refunded,
    cancelled: text.cancelled,
  }[payment.status] || payment.status

  const copyLink = () => {
    if (payment.link) {
      navigator.clipboard.writeText(payment.link)
      toast.success(text.linkCopied)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className="bg-card border rounded-xl p-4 mb-2 active:bg-muted/50 cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Иконка метода */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${methodBg}`}>
            {methodIcon}
          </div>

          <div className="min-w-0 flex-1">
            {/* Header — Имя клиента */}
            <p className="font-semibold text-sm truncate text-start">{clientName}</p>
            {/* Subtext — Метод + номер */}
            <p className="text-xs text-muted-foreground truncate text-start">{subtitle}</p>
          </div>
        </div>

        <div className="text-end flex-shrink-0 ms-3">
          <p className="font-bold text-base">₪{payment.amount}</p>
          <StatusBadge status={payment.status} label={statusLabel} />
        </div>
      </div>
    </div>
  )
}
