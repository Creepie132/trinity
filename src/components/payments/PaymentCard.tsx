'use client'

import { useState } from 'react'
import { CreditCard, Banknote, Receipt, Copy, RotateCcw, FileText } from 'lucide-react'
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
    description?: string
    created_at: string
    transaction_id?: string
    link?: string
  }
  locale: 'he' | 'ru'
  onRefund?: (payment: any) => void
  onRetry?: (payment: any) => void
}

export function PaymentCard({ payment, locale, onRefund, onRetry }: PaymentCardProps) {
  const [detailOpen, setDetailOpen] = useState(false)

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
      card: 'כרטיס אשראי',
      cash: 'מזומן',
      bankTransfer: 'העברה בנקאית',
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
      card: 'Карта',
      cash: 'Наличные',
      bankTransfer: 'Банковский перевод',
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
    },
  }

  const text = t[locale]

  const method = payment.method || payment.payment_method || 'other'
  const clientName =
    payment.client_name ||
    (payment.client
      ? `${payment.client.first_name || ''} ${payment.client.last_name || ''}`.trim()
      : '—')

  const methodIcon = {
    card: <CreditCard size={18} />,
    cash: <Banknote size={18} />,
    bank_transfer: <Receipt size={18} />,
    other: <Receipt size={18} />,
  }[method] || <Receipt size={18} />

  const methodBg = {
    card: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    cash: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    bank_transfer: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    other: 'bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  }[method] || 'bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'

  const methodLabel = {
    card: text.card,
    cash: text.cash,
    bank_transfer: text.bankTransfer,
    other: text.other,
  }[method] || text.other

  const statusLabel = {
    completed: text.paid,
    pending: text.pending,
    failed: text.failed,
    refunded: text.refunded,
  }[payment.status] || payment.status

  const copyLink = () => {
    if (payment.link) {
      navigator.clipboard.writeText(payment.link)
      toast.success(text.linkCopied)
    }
  }

  return (
    <>
      {/* Карточка */}
      <div
        onClick={() => setDetailOpen(true)}
        className="bg-card border rounded-xl p-4 mb-2 active:bg-muted/50 cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Иконка метода */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${methodBg}`}>
              {methodIcon}
            </div>

            <div>
              <p className="font-medium text-sm">{clientName}</p>
              <p className="text-xs text-muted-foreground">
                {payment.description || methodLabel}
              </p>
            </div>
          </div>

          <div className="text-end">
            <p className="font-bold">₪{payment.amount}</p>
            <StatusBadge status={payment.status} label={statusLabel} />
          </div>
        </div>
      </div>

      {/* Drawer с деталями */}
      <TrinityBottomDrawer
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={text.paymentDetails}
      >
        {/* Поля */}
        <div className="space-y-1 mb-6">
          <div className="flex justify-between py-2.5 border-b border-muted">
            <span className="text-sm text-muted-foreground">{text.amount}</span>
            <span className="text-lg font-bold">₪{payment.amount}</span>
          </div>

          <div className="flex justify-between py-2.5 border-b border-muted">
            <span className="text-sm text-muted-foreground">{text.client}</span>
            <span className="text-sm font-medium">{clientName}</span>
          </div>

          <div className="flex justify-between py-2.5 border-b border-muted">
            <span className="text-sm text-muted-foreground">{text.method}</span>
            <span className="text-sm font-medium">{methodLabel}</span>
          </div>

          <div className="flex justify-between py-2.5 border-b border-muted">
            <span className="text-sm text-muted-foreground">{text.status}</span>
            <StatusBadge status={payment.status} label={statusLabel} />
          </div>

          <div className="flex justify-between py-2.5 border-b border-muted">
            <span className="text-sm text-muted-foreground">{text.date}</span>
            <span className="text-sm">
              {new Date(payment.created_at).toLocaleDateString(
                locale === 'he' ? 'he-IL' : 'ru-RU',
                {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }
              )}
            </span>
          </div>

          {payment.description && (
            <div className="py-2.5 border-b border-muted">
              <span className="text-sm text-muted-foreground block mb-1">{text.description}</span>
              <p className="text-sm">{payment.description}</p>
            </div>
          )}

          {payment.transaction_id && (
            <div className="flex justify-between py-2.5 border-b border-muted">
              <span className="text-sm text-muted-foreground">{text.transactionId}</span>
              <span className="text-sm font-mono">{payment.transaction_id}</span>
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="space-y-2">
          {payment.link && (
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition"
            >
              <Copy size={18} />
              {text.copyLink}
            </button>
          )}

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

          {payment.status === 'completed' && onRefund && (
            <button
              onClick={() => {
                onRefund(payment)
                setDetailOpen(false)
              }}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition"
            >
              <RotateCcw size={18} />
              {text.refund}
            </button>
          )}

          <button
            onClick={() => {
              // TODO: Generate receipt
              setDetailOpen(false)
            }}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition"
          >
            <FileText size={18} />
            {text.receipt}
          </button>
        </div>
      </TrinityBottomDrawer>
    </>
  )
}
