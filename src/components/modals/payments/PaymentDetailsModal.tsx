'use client'

import { useModalStore } from '@/store/useModalStore'
import { MessageCircle, MessageSquare, Download, Copy, ExternalLink, X } from 'lucide-react'
import { useEffect } from 'react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export function PaymentDetailsModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  const queryClient = useQueryClient()
  
  const isOpen = isModalOpen('payment-details')
  const data = getModalData('payment-details')

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])
  
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
      whatsappReceipt: '💬 קבלה WhatsApp',
      smsReceipt: 'SMS קבלה',
      download: '⬇️ הורד קבלה',
      whatsappLink: '💬 קישור WhatsApp',
      smsLink: 'SMS קישור',
      copy: '📋 העתק',
      openLink: '🔗 פתח קישור',
      linkCopied: 'הקישור הועתק',
      downloadPending: 'הורדת PDF בקרוב',
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
      whatsappReceipt: '💬 Квитанция WhatsApp',
      smsReceipt: 'SMS Квитанция',
      download: '⬇️ Скачать квитанцию',
      whatsappLink: '💬 Ссылка WhatsApp',
      smsLink: 'SMS Ссылка',
      copy: '📋 Скопировать',
      openLink: '🔗 Перейти по ссылке',
      linkCopied: 'Ссылка скопирована',
      downloadPending: 'Скачивание PDF скоро',
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => closeModal('payment-details')}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-[32px] max-h-[90vh] w-full max-w-4xl overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => closeModal('payment-details')}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center z-10"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          {/* Имя клиента крупно */}
          <h2 className="text-2xl font-bold mb-6 text-center">{clientName}</h2>
          
          {/* Детали */}
          <div className="space-y-1 mb-6">
            <div className="flex justify-between py-3 border-b border-muted">
              <span className="text-sm text-muted-foreground">{text.amount}</span>
              <span className="text-xl font-bold">₪{payment.amount}</span>
            </div>

            <div className="flex justify-between py-3 border-b border-muted">
              <span className="text-sm text-muted-foreground">{text.date}</span>
              <span className="text-sm text-start">
                {new Date(payment.created_at).toLocaleString(
                  locale === 'he' ? 'he-IL' : 'ru-RU'
                )}
              </span>
            </div>

            <div className="flex justify-between py-3 border-b border-muted">
              <span className="text-sm text-muted-foreground">{text.method}</span>
              <span className="text-sm text-start">{methodLabel}</span>
            </div>

            <div className="flex justify-between py-3 border-b border-muted">
              <span className="text-sm text-muted-foreground">{text.status}</span>
              <StatusBadge status={payment.status} label={statusLabel} />
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="space-y-2">
            {/* Paid - receipt buttons */}
            {isPaid && (
              <>
                <button
                  onClick={() => {
                    const message = locale === 'he' 
                      ? `קבלה: ${paymentUrl}`
                      : `Квитанция: ${paymentUrl}`
                    openWhatsApp(message)
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-50 text-green-600 font-medium hover:bg-green-100 transition touch-manipulation"
                >
                  <MessageCircle size={18} />
                  {text.whatsappReceipt}
                </button>

                <button
                  onClick={() => openSMS()}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition touch-manipulation"
                >
                  <MessageSquare size={18} />
                  {text.smsReceipt}
                </button>

                <button
                  onClick={downloadReceipt}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition touch-manipulation"
                >
                  <Download size={18} />
                  {text.download}
                </button>
              </>
            )}

            {/* Pending + credit card - link sharing */}
            {isPendingCard && (
              <>
                <button
                  onClick={() => {
                    const message = locale === 'he' 
                      ? `לתשלום לחץ כאן: ${paymentUrl}`
                      : `Ссылка для оплаты: ${paymentUrl}`
                    openWhatsApp(message)
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-50 text-green-600 font-medium hover:bg-green-100 transition touch-manipulation"
                >
                  <MessageCircle size={18} />
                  {text.whatsappLink}
                </button>

                <button
                  onClick={() => {
                    const message = locale === 'he' 
                      ? `לתשלום לחץ כאן: ${paymentUrl}`
                      : `Ссылка для оплаты: ${paymentUrl}`
                    openSMS(message)
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition touch-manipulation"
                >
                  <MessageSquare size={18} />
                  {text.smsLink}
                </button>

                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border text-slate-600 font-medium hover:bg-muted/50 transition touch-manipulation"
                >
                  <Copy size={18} />
                  {text.copy}
                </button>

                <button
                  onClick={openLink}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition touch-manipulation"
                >
                  <ExternalLink size={18} />
                  {text.openLink}
                </button>
              </>
            )}

            {/* Cancel button for pending payments */}
            {payment.status === 'pending' && (
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault()
                  const res = await fetch(`/api/payments/${payment.id}/cancel`, {
                    method: 'POST'
                  })
                  if (res.ok) {
                    toast.success(text.paymentCancelled)
                    closeModal('payment-details')
                    queryClient.invalidateQueries({ queryKey: ['payments'] })
                  }
                }}
                className="w-full py-3 rounded-2xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition touch-manipulation"
              >
                × {text.cancel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
