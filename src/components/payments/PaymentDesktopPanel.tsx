'use client'

import { useState } from 'react'
import { X, CreditCard, Calendar, Hash, User } from 'lucide-react'
import { getClientName } from '@/lib/client-utils'
import { toast } from 'sonner'

interface PaymentDesktopPanelProps {
  payment: any
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'
  clients: any[]
  onClientClick?: (clientId: string) => void
}

export function PaymentDesktopPanel({
  payment,
  isOpen,
  onClose,
  locale,
  clients,
  onClientClick,
}: PaymentDesktopPanelProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'notes'>('details')

  const isRTL = locale === 'he'
  
  const client = clients.find((c: any) => c.id === payment?.client_id)
  const clientName = client ? getClientName(client) : '—'

  const t = {
    he: {
      details: 'פרטים',
      notes: 'הערות',
      amount: 'סכום',
      status: 'סטטוס',
      method: 'אמצעי תשלום',
      client: 'לקוח',
      date: 'תאריך',
      paymentId: 'מספר תשלום',
      description: 'תיאור',
      noNotes: 'אין הערות',
      cash: 'מזומן',
      credit: 'אשראי',
      bank_transfer: 'העברה בנקאית',
      check: 'המחאה',
      completed: 'הושלם',
      pending: 'ממתין',
      failed: 'נכשל',
      cancelled: 'בוטל',
    },
    ru: {
      details: 'Детали',
      notes: 'Заметки',
      amount: 'Сумма',
      status: 'Статус',
      method: 'Способ оплаты',
      client: 'Клиент',
      date: 'Дата',
      paymentId: 'Номер платежа',
      description: 'Описание',
      noNotes: 'Нет заметок',
      cash: 'Наличные',
      credit: 'Карта',
      bank_transfer: 'Перевод',
      check: 'Чек',
      completed: 'Завершён',
      pending: 'Ожидание',
      failed: 'Ошибка',
      cancelled: 'Отменён',
    },
  }

  const l = t[locale]

  if (!isOpen || !payment) return null

  const paymentDate = new Date(payment.created_at || payment.payment_date)

  const methodLabels: Record<string, string> = {
    cash: l.cash,
    credit: l.credit,
    bank_transfer: l.bank_transfer,
    check: l.check,
  }

  const statusLabels: Record<string, string> = {
    completed: l.completed,
    pending: l.pending,
    failed: l.failed,
    cancelled: l.cancelled,
  }

  const cancelPayment = async (paymentId: string) => {
    try {
      console.log('Cancelling payment from desktop panel:', paymentId)
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
      onClose()
      
      // Refresh page
      window.location.reload()
    } catch (error: any) {
      console.error('Cancel payment error:', error)
      toast.error(`${locale === 'he' ? 'שגיאה' : 'Ошибка'}: ${error.message}`)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch"
      onClick={onClose}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Panel */}
      <div
        className="relative z-10 bg-background shadow-2xl flex h-full w-full max-w-5xl mx-auto my-4 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'grid', gridTemplateColumns: '350px 1fr' }}
      >
        {/* === ЛЕВАЯ ПАНЕЛЬ === */}
        <div className="p-6 flex flex-col border-e border-muted bg-muted/20">
          {/* Закрыть */}
          <button
            onClick={onClose}
            className="self-end mb-4 text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>

          {/* Сумма */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <CreditCard size={14} />
              <span>{l.amount}</span>
            </div>
            <div className="text-3xl font-bold text-primary">₪{payment.amount}</div>
          </div>

          {/* Статус */}
          <div className="mb-4">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                payment.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : payment.status === 'failed'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {statusLabels[payment.status] || payment.status}
            </span>
          </div>

          {/* Метод оплаты */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-1">{l.method}</p>
            <p className="text-base font-medium">
              {methodLabels[payment.payment_method] || payment.payment_method}
            </p>
          </div>

          {/* Клиент */}
          {client && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-1">{l.client}</p>
              <button
                onClick={() => onClientClick?.(client.id)}
                className="text-lg font-semibold text-primary hover:underline"
              >
                {clientName}
              </button>
            </div>
          )}

          {/* Дата */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-1">{l.date}</p>
            <div className="flex items-center gap-2 text-base">
              <Calendar size={16} />
              {paymentDate.toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>

          {/* Номер платежа */}
          {payment.id && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-1">{l.paymentId}</p>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <Hash size={12} />
                {payment.id.substring(0, 8)}
              </div>
            </div>
          )}
        </div>

        {/* === ПРАВАЯ ПАНЕЛЬ === */}
        <div className="flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-muted px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'details'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {l.details}
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'notes'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {l.notes}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'details' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{l.amount}</p>
                    <p className="text-lg font-semibold">₪{payment.amount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{l.status}</p>
                    <p className="text-sm">{statusLabels[payment.status] || payment.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{l.method}</p>
                    <p className="text-sm">
                      {methodLabels[payment.payment_method] || payment.payment_method}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{l.date}</p>
                    <p className="text-sm">
                      {paymentDate.toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}
                    </p>
                  </div>
                </div>
                {payment.description && (
                  <div className="mt-6">
                    <p className="text-xs text-muted-foreground mb-2">{l.description}</p>
                    <p className="text-sm whitespace-pre-wrap">{payment.description}</p>
                  </div>
                )}
                
                {/* Cancel button for pending credit card payments */}
                {payment.status === 'pending' && 
                 (payment.payment_method === 'credit_card' || 
                  payment.payment_method === 'credit' || 
                  payment.payment_method === 'אשראי' || 
                  payment.payment_method === 'card') && (
                  <div className="mt-6">
                    <button
                      onClick={() => cancelPayment(payment.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 transition"
                    >
                      <X size={18} />
                      {locale === 'he' ? 'ביטול' : 'Отменить'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {payment.notes || payment.description ? (
                  <p className="text-sm whitespace-pre-wrap">
                    {payment.notes || payment.description}
                  </p>
                ) : (
                  <p className="text-center py-12 text-muted-foreground text-sm">{l.noNotes}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
