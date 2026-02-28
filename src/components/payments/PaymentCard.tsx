'use client'

import { useState } from 'react'
import { CreditCard, Banknote, Receipt, Copy, RotateCcw, FileText, MessageCircle, MessageSquare, ExternalLink, X } from 'lucide-react'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { toast } from 'sonner'

interface PaymentCardProps {
  payment: {
    id: string
    amount: number
    status: string
    method?: string
    payment_method?: string
    client_name?: string
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
  const [detailOpen, setDetailOpen] = useState(false)
  
  const handleCardClick = () => {
    if (onClick) {
      onClick(payment)
    } else {
      setDetailOpen(true)
    }
  }

  const cancelPayment = async (paymentId: string) => {
    try {
      console.log('Cancelling payment from client:', paymentId)
      const response = await fetch(`/api/payments/${paymentId}/cancel`, {
        method: 'POST',
      })

      console.log('Response status:', response.status)
      const responseData = await response.json()
      console.log('Response data:', responseData)

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to cancel payment')
      }

      toast.success(locale === 'he' ? 'התשלום בוטל בהצלחה' : 'Платёж успешно отменён')
      setDetailOpen(false)
      
      // Refresh page
      window.location.reload()
    } catch (error: any) {
      console.error('Cancel payment error:', error)
      toast.error(`${locale === 'he' ? 'שגיאה' : 'Ошибка'}: ${error.message}`)
    }
  }

  const t = {
    he: {
      paymentDetails: 'פרטי תשלום',
      amount: 'סכום',
      client: 'לקוח',
      method: 'אמצעי תשלום',
      status: 'סטטוס',
      date: 'תאריך',
      description: 'תיאור',
      transactionId: 'מזהה עסקה',
      id: 'מזהה',
      notes: 'הערות',
      card: 'כרטיס',
      cash: 'מזומן',
      bankTransfer: 'העברה',
      bit: 'ביט',
      other: 'אחר',
      retry: 'נסה שוב',
      refund: 'החזר כספי',
      receipt: 'קבלה',
      copyLink: 'העתק קישור',
      linkCopied: 'הקישור הועתק',
      paid: 'שולם',
      pending: 'ממתין',
      failed: 'נכשל',
      refunded: 'הוחזר',
      cancelled: 'בוטל',
    },
    ru: {
      paymentDetails: 'Детали платежа',
      amount: 'Сумма',
      client: 'Клиент',
      method: 'Способ оплаты',
      status: 'Статус',
      date: 'Дата',
      description: 'Описание',
      transactionId: 'ID транзакции',
      id: 'ID',
      notes: 'Заметки',
      card: 'Карта',
      cash: 'Наличные',
      bankTransfer: 'Перевод',
      bit: 'Bit',
      other: 'Другое',
      retry: 'Повторить',
      refund: 'Возврат',
      receipt: 'Квитанция',
      copyLink: 'Скопировать ссылку',
      linkCopied: 'Ссылка скопирована',
      paid: 'Оплачено',
      pending: 'Ожидает',
      failed: 'Ошибка',
      refunded: 'Возвращено',
      cancelled: 'Отменён',
    },
  }

  const text = t[locale]

  // Parse payment info with priority logic
  function parsePaymentInfo(description: string | undefined, payment: any) {
    // Priority: separate fields from object
    if (payment.client_name || payment.client) {
      const clientName = payment.client_name ||
        (payment.client
          ? `${payment.client.first_name || ''} ${payment.client.last_name || ''}`.trim()
          : '—')
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
        clientName: name || '—',
        subtitle: formatSubtitle(payment, method)
      }
    }

    return {
      clientName: description || '—',
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
    <>
      {/* Мобильная карточка */}
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

      {/* Drawer с деталями */}
      <TrinityBottomDrawer
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={clientName}
      >
        {/* Поля */}
        <div className="space-y-1 mb-6">
          <div className="flex justify-between py-2.5 border-b border-muted">
            <span className="text-sm text-muted-foreground">{text.amount}</span>
            <span className="text-lg font-bold">₪{payment.amount}</span>
          </div>

          <div className="flex justify-between py-2.5 border-b border-muted">
            <span className="text-sm text-muted-foreground">{text.status}</span>
            <StatusBadge status={payment.status} label={statusLabel} />
          </div>

          <div className="flex justify-between py-2.5 border-b border-muted">
            <span className="text-sm text-muted-foreground">{text.method}</span>
            <span className="text-sm text-start">{methodLabel}</span>
          </div>

          <div className="flex justify-between py-2.5 border-b border-muted">
            <span className="text-sm text-muted-foreground">{text.date}</span>
            <span className="text-sm text-start">
              {new Date(payment.created_at).toLocaleString(
                locale === 'he' ? 'he-IL' : 'ru-RU'
              )}
            </span>
          </div>

          {payment.id && (
            <div className="flex justify-between py-2.5 border-b border-muted">
              <span className="text-sm text-muted-foreground">{text.id}</span>
              <span className="text-sm font-mono text-muted-foreground">{payment.id.slice(0, 8)}</span>
            </div>
          )}

          {payment.notes && (
            <div className="py-2.5">
              <span className="text-sm text-muted-foreground block mb-1">{text.notes}</span>
              <p className="text-sm text-start">{payment.notes}</p>
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="space-y-2">
          {/* Pending payment - share buttons */}
          {payment.status === 'pending' && (
            <>
              {payment.client_phone && (
                <button
                  onClick={() => {
                    const phone = payment.client_phone?.replace(/[^0-9]/g, '') || ''
                    const link = payment.payment_url || payment.link || ''
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(link)}`, '_blank')
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-50 text-green-600 font-medium hover:bg-green-100 transition"
                >
                  <MessageCircle size={18} />
                  WhatsApp
                </button>
              )}

              <button
                onClick={() => {
                  toast.info(locale === 'he' ? 'בקרוב' : 'SMS скоро')
                }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition"
              >
                <MessageSquare size={18} />
                SMS
              </button>

              {(payment.payment_url || payment.link) && (
                <button
                  onClick={() => {
                    const url = payment.payment_url || payment.link
                    if (url) window.open(url, '_blank')
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition"
                >
                  <ExternalLink size={18} />
                  {locale === 'he' ? 'פתח קישור' : 'Перейти по ссылке'}
                </button>
              )}

              {(payment.payment_url || payment.link) && (
                <button
                  onClick={() => {
                    const url = payment.payment_url || payment.link
                    if (url) {
                      navigator.clipboard.writeText(url)
                      toast.success(text.linkCopied)
                    }
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border text-slate-600 font-medium hover:bg-muted/50 transition"
                >
                  <Copy size={18} />
                  {locale === 'he' ? 'העתק קישור' : 'Копировать ссылку'}
                </button>
              )}

              {/* Cancel button for credit card payments */}
              {(payment.payment_method === 'credit_card' || 
                payment.payment_method === 'credit' || 
                payment.payment_method === 'אשראי' || 
                payment.payment_method === 'card') && (
                <button
                  onClick={() => cancelPayment(payment.id)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-50 text-red-600 font-medium hover:bg-red-100 transition"
                >
                  <X size={18} />
                  {locale === 'he' ? 'ביטול' : 'Отменить'}
                </button>
              )}
            </>
          )}

          {/* Completed payment - receipt button */}
          {payment.status === 'completed' && (
            <>
              <button
                onClick={() => {
                  toast.info(locale === 'he' ? 'בקרוב' : 'Скоро')
                }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-primary text-primary font-medium hover:bg-primary/10 transition"
              >
                <FileText size={18} />
                {locale === 'he' ? 'קבלה' : 'Квитанция'}
              </button>

              {onRefund && (
                <button
                  onClick={() => {
                    onRefund(payment)
                    setDetailOpen(false)
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-50 text-red-600 font-medium hover:bg-red-100 transition"
                >
                  <RotateCcw size={18} />
                  {text.refund}
                </button>
              )}
            </>
          )}

          {/* Failed payment - retry */}
          {payment.status === 'failed' && onRetry && (
            <button
              onClick={() => {
                onRetry(payment)
                setDetailOpen(false)
              }}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition"
            >
              <RotateCcw size={18} />
              {text.retry}
            </button>
          )}
        </div>
      </TrinityBottomDrawer>
    </>
  )
}
