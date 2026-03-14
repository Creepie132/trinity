'use client'

import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { MessageCircle, MessageSquare, Download, Copy, ExternalLink } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export function PaymentDetailsModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  const queryClient = useQueryClient()
  
  const isOpen = isModalOpen('payment-details')
  const data = getModalData('payment-details')
  
  if (!data?.payment || !isOpen) return null

  const { payment } = data
  const locale = data.locale || 'he'

  const t = {
    he: {
      amount: 'סכום',
      date: 'תאריך',
      method: 'אמצעי תשלום',
      status: 'סטטוס',
      paid: 'שולם',
      pending: 'ממתין',
      failed: 'נכשל',
      refunded: 'הוחזר',
      cancelled: 'בוטל',
      whatsappReceipt: 'WhatsApp קבלה',
      smsReceipt: 'SMS קבלה',
      download: 'הורד',
      whatsappLink: 'WhatsApp קישור',
      smsLink: 'SMS קישור',
      copy: 'העתק',
      openLink: 'פתח קישור',
      linkCopied: 'הקישור הועתק',
      cash: 'מזומן',
      card: 'כרטיס',
      transfer: 'העברה',
      bit: 'ביט',
      other: 'אחר',
      cancel: 'ביטול',
      paymentCancelled: 'בוטל',
    },
    ru: {
      amount: 'Сумма',
      date: 'Дата',
      method: 'Способ оплаты',
      status: 'Статус',
      paid: 'Оплачено',
      pending: 'Ожидает',
      failed: 'Ошибка',
      refunded: 'Возвращено',
      cancelled: 'Отменён',
      whatsappReceipt: 'WhatsApp Квитанция',
      smsReceipt: 'SMS Квитанция',
      download: 'Скачать',
      whatsappLink: 'WhatsApp Ссылка',
      smsLink: 'SMS Ссылка',
      copy: 'Скопировать',
      openLink: 'Открыть',
      linkCopied: 'Ссылка скопирована',
      cash: 'Наличные',
      card: 'Карта',
      transfer: 'Перевод',
      bit: 'Bit',
      other: 'Другое',
      cancel: 'Отменить',
      paymentCancelled: 'Платёж отменён',
    },
  }

  const text = t[locale as 'he' | 'ru']

  // Parse client name
  const clientName = payment.client_name ||
    (payment.clients
      ? `${payment.clients.first_name || ''} ${payment.clients.last_name || ''}`.trim()
      : payment.description || '—')

  // Method label
  const methodLabels: Record<string, { he: string, ru: string }> = {
    cash: { he: 'מזומן', ru: 'Наличные' },
    card: { he: 'כרטיס', ru: 'Карта' },
    credit_card: { he: 'כרטיס', ru: 'Карта' },
    transfer: { he: 'העברה', ru: 'Перевод' },
    bank_transfer: { he: 'העברה', ru: 'Перевод' },
    bit: { he: 'ביט', ru: 'Bit' },
  }

  const method = payment.method || payment.payment_method || 'other'
  const methodLabel = methodLabels[method]?.[locale as 'he' | 'ru'] || text.other

  // Status label
  const statusLabels: Record<string, string> = {
    completed: text.paid,
    paid: text.paid,
    pending: text.pending,
    failed: text.failed,
    refunded: text.refunded,
    cancelled: text.cancelled,
  }
  const statusLabel = statusLabels[payment.status] || payment.status

  const phone = payment.clients?.phone || payment.client_phone || ''
  const paymentUrl = payment.payment_link || payment.payment_url || payment.link || ''

  const openWhatsApp = (message: string) => {
    if (!phone) {
      toast.error(locale === 'he' ? 'אין מספר טלפון' : 'Номер телефона отсутствует')
      return
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/972${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const openSMS = (body?: string) => {
    if (!phone) {
      toast.error(locale === 'he' ? 'אין מספר טלפון' : 'Номер телефона отсутствует')
      return
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const url = body ? `sms:${cleanPhone}&body=${encodeURIComponent(body)}` : `sms:${cleanPhone}`
    window.open(url, '_blank')
  }

  const copyLink = () => {
    if (paymentUrl) {
      navigator.clipboard.writeText(paymentUrl)
      toast.success(text.linkCopied)
    }
  }

  const openLink = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank')
    }
  }

  const downloadReceipt = () => {
    const url = `/api/payments/${payment.id}/receipt?locale=${locale}`
    window.open(url, '_blank')
  }

  const isPaid = payment.status === 'completed' || payment.status === 'paid'
  const isPendingCard = payment.status === 'pending' && 
    (method === 'credit_card' || method === 'card' || method === 'אשראי')

  // Build footer based on payment status
  const getFooter = () => {
    if (isPaid) {
      return (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              const message = locale === 'he' ? `קבלה: ${paymentUrl}` : `Квитанция: ${paymentUrl}`
              openWhatsApp(message)
            }}
            className="w-full py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium border border-green-200 dark:border-green-800 flex items-center justify-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4" />
            {text.whatsappReceipt}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => openSMS()}
              className="flex-1 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm font-medium border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4" />
              {text.smsReceipt}
            </button>
            <button
              onClick={downloadReceipt}
              className="flex-1 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              {text.download}
            </button>
          </div>
        </div>
      )
    }

    if (isPendingCard) {
      return (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              const message = locale === 'he' ? `לתשלום לחץ כאן: ${paymentUrl}` : `Ссылка для оплаты: ${paymentUrl}`
              openWhatsApp(message)
            }}
            className="w-full py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium border border-green-200 dark:border-green-800 flex items-center justify-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4" />
            {text.whatsappLink}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const message = locale === 'he' ? `לתשלום לחץ כאן: ${paymentUrl}` : `Ссылка для оплаты: ${paymentUrl}`
                openSMS(message)
              }}
              className="flex-1 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm font-medium border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4" />
              {text.smsLink}
            </button>
            <button
              onClick={copyLink}
              className="flex-1 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
            >
              <Copy className="w-4 h-4" />
              {text.copy}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openLink}
              className="flex-1 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-4 h-4" />
              {text.openLink}
            </button>
            <button
              onClick={async () => {
                const res = await fetch(`/api/payments/${payment.id}/cancel`, { method: 'POST' })
                if (res.ok) {
                  toast.success(text.paymentCancelled)
                  closeModal('payment-details')
                  queryClient.invalidateQueries({ queryKey: ['payments'] })
                }
              }}
              className="flex-1 min-h-[44px] rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors whitespace-nowrap"
            >
              {text.cancel}
            </button>
          </div>
        </div>
      )
    }

    // For pending non-card payments, just show cancel
    if (payment.status === 'pending') {
      return (
        <button
          onClick={async () => {
            const res = await fetch(`/api/payments/${payment.id}/cancel`, { method: 'POST' })
            if (res.ok) {
              toast.success(text.paymentCancelled)
              closeModal('payment-details')
              queryClient.invalidateQueries({ queryKey: ['payments'] })
            }
          }}
          className="w-full min-h-[44px] rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors whitespace-nowrap"
        >
          {text.cancel}
        </button>
      )
    }

    return null
  }

  return (
    <Modal
      open={isOpen}
      onClose={() => closeModal('payment-details')}
      title={clientName}
      subtitle={new Date(payment.created_at).toLocaleString(locale === 'he' ? 'he-IL' : 'ru-RU')}
      width="480px"
      dir={locale === 'he' ? 'rtl' : 'ltr'}
      footer={getFooter()}
    >
      <div dir={locale === 'he' ? 'rtl' : 'ltr'}>
        {/* Сумма — крупный акцент */}
        <div className="flex flex-col items-center py-4 mb-2">
          <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">₪{payment.amount}</p>
          <StatusBadge status={payment.status} label={statusLabel} />
        </div>

        <div className="space-y-1 border-t border-gray-100 dark:border-gray-800 pt-3">
          <div className="flex justify-between py-2.5 border-b border-gray-50 dark:border-gray-800/60">
            <span className="text-sm text-gray-400">{text.method}</span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{methodLabel}</span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-sm text-gray-400">{text.date}</span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200" dir="ltr">
              {new Date(payment.created_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
