'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  MessageCircle, FileText, RotateCcw, Receipt,
  CreditCard, Banknote, Smartphone, Building2, CheckCircle2,
  Clock, AlertCircle, Ban, TrendingUp, Loader2,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'

interface PaymentDetailsDrawerProps {
  payment: any | null
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'
  isOwner: boolean
  onRefunded?: () => void
}

const METHOD_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; gradient: string }> = {
  cash:          { icon: <Banknote size={20} />,    color: '#16a34a', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#bbf7d0', gradient: 'linear-gradient(135deg,#22c55e,#16a34a)' },
  bit:           { icon: <Smartphone size={20} />,  color: '#ea580c', bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '#fed7aa', gradient: 'linear-gradient(135deg,#f97316,#ea580c)' },
  credit_card:   { icon: <CreditCard size={20} />,  color: '#4f46e5', bg: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', border: '#c7d2fe', gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
  card:          { icon: <CreditCard size={20} />,  color: '#4f46e5', bg: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', border: '#c7d2fe', gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
  bank_transfer: { icon: <Building2 size={20} />,   color: '#0284c7', bg: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '#bae6fd', gradient: 'linear-gradient(135deg,#38bdf8,#0284c7)' },
  transfer:      { icon: <Building2 size={20} />,   color: '#0284c7', bg: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '#bae6fd', gradient: 'linear-gradient(135deg,#38bdf8,#0284c7)' },
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; icon: React.ReactNode }> = {
  completed: { color: '#16a34a', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  dot: '#22c55e', icon: <CheckCircle2 size={12} /> },
  paid:      { color: '#16a34a', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  dot: '#22c55e', icon: <CheckCircle2 size={12} /> },
  pending:   { color: '#d97706', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', dot: '#fbbf24', icon: <Clock size={12} /> },
  failed:    { color: '#dc2626', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  dot: '#ef4444', icon: <AlertCircle size={12} /> },
  refunded:  { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', dot: '#818cf8', icon: <TrendingUp size={12} /> },
  cancelled: { color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', dot: '#94a3b8', icon: <Ban size={12} /> },
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

export function PaymentDetailsDrawer({ payment, isOpen, onClose, locale, isOwner, onRefunded }: PaymentDetailsDrawerProps) {
  const [refunding, setRefunding]    = useState(false)
  const [sendingReceipt, setSending] = useState(false)
  const [downloadingPdf, setDownloading] = useState(false)
  const isHe = locale === 'he'
  const dir  = isHe ? 'rtl' : 'ltr'

  const L = {
    he: {
      method: 'אמצעי תשלום', status: 'סטטוס', date: 'תאריך',
      tranzilaId: 'מזהה Tranzila', internalId: 'מזהה פנימי', type: 'סוג',
      sendWhatsapp: 'שלח קבלה ב-WhatsApp', downloadPdf: 'הורד PDF (Tranzila)',
      refund: 'בצע החזר', refundConfirm: 'אשר החזר?',
      refundSuccess: 'ההחזר בוצע', refundError: 'שגיאה בהחזר',
      receiptSent: 'קבלה נשלחה!', receiptError: 'שגיאה בשליחת קבלה',
      paid: 'שולם', pending: 'ממתין', failed: 'נכשל', refunded: 'הוחזר', cancelled: 'בוטל',
      cash: 'מזומן', credit_card: 'כרטיס', bank_transfer: 'העברה', bit: 'ביט',
      service: 'שירות', product: 'מוצר', subscription: 'מנוי',
      noPhone: 'אין מספר טלפון', close: 'סגור', description: 'תיאור', phone: 'טלפון',
    },
    ru: {
      method: 'Способ оплаты', status: 'Статус', date: 'Дата',
      tranzilaId: 'Tranzila ID', internalId: 'Внутренний ID', type: 'Тип',
      sendWhatsapp: 'Отправить квитанцию WA', downloadPdf: 'Скачать PDF (Tranzila)',
      refund: 'Возврат', refundConfirm: 'Подтвердить возврат?',
      refundSuccess: 'Возврат выполнен', refundError: 'Ошибка возврата',
      receiptSent: 'Квитанция отправлена!', receiptError: 'Ошибка отправки',
      paid: 'Оплачено', pending: 'Ожидает', failed: 'Ошибка', refunded: 'Возвращено', cancelled: 'Отменён',
      cash: 'Наличные', credit_card: 'Карта', bank_transfer: 'Перевод', bit: 'Bit',
      service: 'Услуга', product: 'Товар', subscription: 'Абонемент',
      noPhone: 'Нет телефона', close: 'Закрыть', description: 'Описание', phone: 'Телефон',
    },
  }
  const l = L[locale]

  if (!payment) return null

  const clientName = payment.client_name || (payment.clients ? `${payment.clients.first_name || ''} ${payment.clients.last_name || ''}`.trim() : null) || '—'
  const clientPhone = payment.clients?.phone || payment.client_phone || ''
  const paymentDate = payment.paid_at || payment.created_at
  const formattedDate = paymentDate ? format(new Date(paymentDate), 'dd/MM/yyyy HH:mm') : '—'
  const method = payment.payment_method || 'cash'
  const mc = METHOD_CONFIG[method] || { icon: <Receipt size={20} />, color: '#64748b', bg: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: '#e2e8f0', gradient: 'linear-gradient(135deg,#94a3b8,#64748b)' }
  const sc = STATUS_CONFIG[payment.status] || STATUS_CONFIG.cancelled
  const methodLabel: Record<string, string> = { cash: l.cash, credit_card: l.credit_card, card: l.credit_card, bank_transfer: l.bank_transfer, bit: l.bit, transfer: l.bank_transfer }
  const statusLabel: Record<string, string> = { completed: l.paid, paid: l.paid, pending: l.pending, failed: l.failed, refunded: l.refunded, cancelled: l.cancelled }
  const tranzilaId = payment.transaction_id || payment.metadata?.tranzila_transaction_id || payment.metadata?.transaction_id || null
  const typeLabel = payment.subscription_period_start ? l.subscription : payment.type === 'product' ? l.product : l.service
  const initials = getInitials(clientName)

  const handleWhatsApp = async () => {
    if (!clientPhone) { toast.error(l.noPhone); return }
    setSending(true)
    try {
      const res = await fetch(`/api/payments/${payment.id}/send-receipt`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(l.receiptSent)
    } catch (e: any) { toast.error(`${l.receiptError}: ${e.message}`) }
    finally { setSending(false) }
  }

  const handleDownloadPdf = async () => {
    setDownloading(true)
    try {
      if (!payment.tranzila_document_id) {
        const res = await fetch(`/api/payments/${payment.id}/send-receipt`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create receipt')
      }
      window.open(`/api/payments/${payment.id}/tranzila-pdf`, '_blank')
    } catch (e: any) { toast.error(`${l.receiptError}: ${e.message}`) }
    finally { setDownloading(false) }
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
    } catch (e: any) { toast.error(`${l.refundError}: ${e.message}`) }
    finally { setRefunding(false) }
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Avatar with method gradient */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: mc.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 900, boxShadow: `0 6px 20px ${mc.color}44` }}>
          {initials || mc.icon}
        </div>
      </div>
      {/* Date */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: 20 }}>{formattedDate}</span>
      </div>
      {/* Amount */}
      <div style={{ background: sc.bg, border: `0.5px solid ${sc.border}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: sc.color, letterSpacing: '-1px', lineHeight: 1 }}>₪{Number(payment.amount).toFixed(2)}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 5 }}>
          <span style={{ color: sc.color }}>{sc.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{statusLabel[payment.status] || payment.status}</span>
        </div>
      </div>
      {/* Method */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 10 }}>
        <span style={{ color: mc.color }}>{mc.icon}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{methodLabel[method] || method}</span>
      </div>
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', marginBottom: 10 }} />
      {/* Actions */}
      {clientPhone && (
        <button onClick={handleWhatsApp} disabled={sendingReceipt}
          style={{ padding: '9px 10px', borderRadius: 9, border: 'none', background: 'rgba(34,197,94,0.15)', color: '#34d399', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: sendingReceipt ? 0.6 : 1 }}>
          {sendingReceipt ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageCircle size={13} />}
          {l.sendWhatsapp}
        </button>
      )}
      {payment.status === 'completed' && (
        <button onClick={handleDownloadPdf} disabled={downloadingPdf}
          style={{ padding: '9px 10px', borderRadius: 9, border: '0.5px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: downloadingPdf ? 0.6 : 1 }}>
          {downloadingPdf ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={13} />}
          {l.downloadPdf}
        </button>
      )}
      {isOwner && payment.status === 'completed' && (
        <button onClick={handleRefund} disabled={refunding}
          style={{ padding: '9px 10px', borderRadius: 9, border: '0.5px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          {refunding ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={13} />}
          {l.refund}
        </button>
      )}
      <button onClick={onClose}
        style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', marginTop: 2 }}>
        {l.close}
      </button>
    </div>
  )

  return (
    <Modal open={isOpen} onClose={onClose} darkHeader showCloseButton={false} width="700px" dir={dir} contentClassName="!p-0">
      <TrinityModalShell open={isOpen} onClose={onClose} icon={<Receipt />}
        title={clientName} subtitle={formattedDate} dir={dir} sidebarExtra={sidebar}>
        <div style={{ padding: '20px 18px 24px' }} className="space-y-4">

          {/* Amount hero */}
          <div style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 16, padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: sc.color, letterSpacing: '-2px', lineHeight: 1, marginBottom: 8 }}>
              ₪{Number(payment.amount).toFixed(2)}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 20, background: `${sc.dot}20`, border: `1px solid ${sc.dot}40` }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc.dot }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: sc.color, letterSpacing: '0.05em' }}>{statusLabel[payment.status] || payment.status}</span>
            </div>
          </div>

          {/* Method + Type cards */}
          <div className="grid grid-cols-2 gap-3">
            <div style={{ background: mc.bg, border: `1px solid ${mc.border}`, borderRadius: 14, padding: '12px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: mc.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{l.method}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: mc.color }}>{mc.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{methodLabel[method] || method}</span>
              </div>
            </div>
            <div style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{l.type}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>{typeLabel}</p>
            </div>
          </div>

          {/* Phone */}
          {clientPhone && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{l.phone}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', fontFamily: 'monospace' }}>{clientPhone}</span>
            </div>
          )}

          {/* Description */}
          {payment.description && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{l.description}</p>
              <p style={{ fontSize: 13, color: '#78350f', margin: 0, lineHeight: 1.5 }}>{payment.description}</p>
            </div>
          )}

          {/* IDs */}
          <div className="space-y-2">
            {tranzilaId && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{l.tranzilaId}</span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>{tranzilaId}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600 }}>{l.internalId}:</span>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#cbd5e1' }}>{payment.id?.slice(0, 16)}…</span>
            </div>
          </div>

        </div>
      </TrinityModalShell>
    </Modal>
  )
}
