'use client'

import { useState } from 'react'
import { X, FileText, MessageCircle, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface PaymentDetailsDrawerProps {
  payment: any | null
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'
  isOwner: boolean
  onRefunded?: () => void
}

export function PaymentDetailsDrawer({
  payment,
  isOpen,
  onClose,
  locale,
  isOwner,
  onRefunded,
}: PaymentDetailsDrawerProps) {
  const [refunding, setRefunding] = useState(false)

  if (!isOpen || !payment) return null

  const isRTL = locale === 'he'

  const labels = {
    he: {
      amount: 'סכום', method: 'אמצעי תשלום', status: 'סטטוס', date: 'תאריך',
      tranzilaId: 'מזהה Tranzila', internalId: 'מזהה פנימי', type: 'סוג',
      sendWhatsapp: 'שלח ב-WhatsApp', downloadPdf: 'הורד קבלה PDF',
      refund: 'ביצוע החזר', refundConfirm: 'אשר החזר?',
      refundSuccess: 'ההחזר בוצע', refundError: 'שגיאה בהחזר',
      paid: 'שולם', pending: 'ממתין', failed: 'נכשל', refunded: 'הוחזר', cancelled: 'בוטל',
      cash: 'מזומן', credit_card: 'כרטיס', bank_transfer: 'העברה', bit: 'ביט',
      service: 'שירות', product: 'מוצר', subscription: 'מנוי',
      noPhone: 'אין מספר טלפון',
    },
    ru: {
      amount: 'Сумма', method: 'Способ оплаты', status: 'Статус', date: 'Дата',
      tranzilaId: 'Tranzila ID', internalId: 'Внутренний ID', type: 'Тип',
      sendWhatsapp: 'Отправить в WhatsApp', downloadPdf: 'Скачать PDF чек',
      refund: 'Возврат (Refund)', refundConfirm: 'Подтвердить возврат?',
      refundSuccess: 'Возврат выполнен', refundError: 'Ошибка возврата',
      paid: 'Оплачено', pending: 'Ожидает', failed: 'Ошибка', refunded: 'Возвращено', cancelled: 'Отменён',
      cash: 'Наличные', credit_card: 'Карта', bank_transfer: 'Перевод', bit: 'Bit',
      service: 'Услуга', product: 'Товар', subscription: 'Абонемент',
      noPhone: 'Нет номера телефона',
    },
  }
  const l = labels[locale]

  const clientName =
    payment.client_name ||
    (payment.clients
      ? `${payment.clients.first_name || ''} ${payment.clients.last_name || ''}`.trim()
      : null) ||
    '—'

  const clientPhone = payment.clients?.phone || payment.client_phone || ''
  const paymentDate = payment.paid_at || payment.created_at
  const formattedDate = paymentDate ? format(new Date(paymentDate), 'dd/MM/yyyy HH:mm') : '—'

  const methodLabel: Record<string, string> = {
    cash: l.cash, credit_card: l.credit_card, card: l.credit_card,
    bank_transfer: l.bank_transfer, bit: l.bit,
  }
  const statusLabel: Record<string, string> = {
    completed: l.paid, pending: l.pending, failed: l.failed,
    refunded: l.refunded, cancelled: l.cancelled,
  }
  const statusColor: Record<string, string> = {
    completed: 'text-green-600 dark:text-green-400',
    pending: 'text-amber-600 dark:text-amber-400',
    failed: 'text-red-600 dark:text-red-400',
    refunded: 'text-gray-500', cancelled: 'text-gray-500',
  }

  const tranzilaId =
    payment.transaction_id ||
    payment.metadata?.tranzila_transaction_id ||
    payment.metadata?.transaction_id ||
    null

  const handleWhatsApp = () => {
    if (!clientPhone) { toast.error(l.noPhone); return }
    const cleaned = clientPhone.replace(/\D/g, '')
    const phone = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned.startsWith('972') ? cleaned.slice(3) : cleaned
    const msg = locale === 'he'
      ? `שלום ${clientName}, אישור תשלום ₪${Number(payment.amount).toFixed(2)} התקבל. תודה!`
      : `Здравствуйте, ${clientName}! Оплата ₪${Number(payment.amount).toFixed(2)} получена. Спасибо!`
    window.open(`https://wa.me/972${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleDownloadPdf = () => {
    window.open(`/api/payments/${payment.id}/receipt?locale=${locale}`, '_blank')
  }

  const handleRefund = async () => {
    if (!confirm(l.refundConfirm)) return
    setRefunding(true)
    try {
      const res = await fetch(`/api/payments/${payment.id}/refund`, { method: 'POST' })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Refund failed') }
      toast.success(l.refundSuccess)
      onRefunded?.()
      onClose()
    } catch (e: any) {
      toast.error(`${l.refundError}: ${e.message}`)
    } finally {
      setRefunding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        style={{ animation: 'pdFadeIn .2s ease-out both' }}
      />

      {/* Modal */}
      <div
        className="relative z-10 bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: 'pdSlideUp .3s cubic-bezier(.2,.8,.3,1) both' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <p className="font-semibold text-base text-gray-900 dark:text-gray-100">{clientName}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formattedDate}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Amount + status */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            ₪{Number(payment.amount).toFixed(2)}
          </span>
          <span className={`text-sm font-medium ${statusColor[payment.status] || 'text-gray-500'}`}>
            {statusLabel[payment.status] || payment.status}
          </span>
        </div>

        {/* Details grid */}
        <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-3 border-b border-gray-100 dark:border-gray-800">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{l.method}</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {methodLabel[payment.payment_method] || payment.payment_method || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{l.type}</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {payment.subscription_period_start ? l.subscription : payment.type === 'product' ? l.product : l.service}
            </p>
          </div>
          {tranzilaId && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">{l.tranzilaId}</p>
              <p className="text-xs font-mono text-gray-500 break-all">{tranzilaId}</p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-xs text-gray-400 mb-0.5">{l.internalId}</p>
            <p className="text-xs font-mono text-gray-500">{payment.id?.slice(0, 16)}…</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 flex flex-col gap-2">
          {clientPhone && (
            <button onClick={handleWhatsApp} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium hover:bg-green-100 transition-colors active:scale-[.98]">
              <MessageCircle size={16} />{l.sendWhatsapp}
            </button>
          )}
          {payment.status === 'completed' && (
            <button onClick={handleDownloadPdf} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 transition-colors active:scale-[.98]">
              <FileText size={16} />{l.downloadPdf}
            </button>
          )}
          {isOwner && payment.status === 'completed' && (
            <button onClick={handleRefund} disabled={refunding} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 transition-colors active:scale-[.98] disabled:opacity-50">
              <RotateCcw size={16} className={refunding ? 'animate-spin' : ''} />{l.refund}
            </button>
          )}
        </div>

        <div className="sm:hidden" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>

      <style>{`
        @keyframes pdFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes pdSlideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  )
}
