'use client'

import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { MessageCircle, MessageSquare, Download, Copy, ExternalLink, Receipt, CreditCard, Banknote, Smartphone, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

const METHOD_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  cash:          { icon: <Banknote size={18} />,    color: '#16a34a', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#bbf7d0' },
  bit:           { icon: <Smartphone size={18} />,  color: '#ea580c', bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '#fed7aa' },
  credit_card:   { icon: <CreditCard size={18} />,  color: '#4f46e5', bg: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', border: '#c7d2fe' },
  card:          { icon: <CreditCard size={18} />,  color: '#4f46e5', bg: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', border: '#c7d2fe' },
  bank_transfer: { icon: <Building2 size={18} />,   color: '#0284c7', bg: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '#bae6fd' },
  transfer:      { icon: <Building2 size={18} />,   color: '#0284c7', bg: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '#bae6fd' },
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  completed: { color: '#16a34a', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  dot: '#22c55e' },
  paid:      { color: '#16a34a', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  dot: '#22c55e' },
  pending:   { color: '#d97706', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', dot: '#fbbf24' },
  failed:    { color: '#dc2626', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  dot: '#ef4444' },
  refunded:  { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', dot: '#818cf8' },
  cancelled: { color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', dot: '#94a3b8' },
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

export function PaymentDetailsModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  const queryClient = useQueryClient()

  const isOpen = isModalOpen('payment-details')
  const data = getModalData('payment-details')
  if (!data?.payment || !isOpen) return null

  const { payment } = data
  const locale = data.locale || 'he'
  const isHe = locale === 'he'
  const dir = isHe ? 'rtl' : 'ltr'

  const T = {
    he: { paid: 'שולם', pending: 'ממתין', failed: 'נכשל', refunded: 'הוחזר', cancelled: 'בוטל', method: 'אמצעי תשלום', date: 'תאריך', cash: 'מזומן', card: 'כרטיס', transfer: 'העברה', bit: 'ביט', other: 'אחר', cancel: 'ביטול', paymentCancelled: 'בוטל', whatsappReceipt: 'קבלה WA', smsReceipt: 'SMS קבלה', download: 'הורד', whatsappLink: 'קישור WA', smsLink: 'SMS קישור', copy: 'העתק', openLink: 'פתח', close: 'סגור', linkCopied: 'הועתק', description: 'תיאור', phone: 'טלפון', id: 'מזהה', type: 'סוג', service: 'שירות' },
    ru: { paid: 'Оплачено', pending: 'Ожидает', failed: 'Ошибка', refunded: 'Возврат', cancelled: 'Отменён', method: 'Способ оплаты', date: 'Дата', cash: 'Наличные', card: 'Карта', transfer: 'Перевод', bit: 'Bit', other: 'Другое', cancel: 'Отменить', paymentCancelled: 'Платёж отменён', whatsappReceipt: 'WA Квитанция', smsReceipt: 'SMS Квитанция', download: 'Скачать', whatsappLink: 'WA Ссылка', smsLink: 'SMS Ссылка', copy: 'Копировать', openLink: 'Открыть', close: 'Закрыть', linkCopied: 'Скопировано', description: 'Описание', phone: 'Телефон', id: 'ID', type: 'Тип', service: 'Услуга' },
  }
  const t = T[locale as 'he' | 'ru']

  const clientName = payment.client_name || (payment.clients ? `${payment.clients.first_name || ''} ${payment.clients.last_name || ''}`.trim() : payment.description || '—')
  const method = payment.method || payment.payment_method || 'other'
  const methodLabels: Record<string, { he: string; ru: string }> = {
    cash: { he: 'מזומן', ru: 'Наличные' }, card: { he: 'כרטיס', ru: 'Карта' },
    credit_card: { he: 'כרטיס', ru: 'Карта' }, transfer: { he: 'העברה', ru: 'Перевод' },
    bank_transfer: { he: 'העברה', ru: 'Перевод' }, bit: { he: 'ביט', ru: 'Bit' },
  }
  const methodLabel = methodLabels[method]?.[locale as 'he' | 'ru'] || t.other
  const statusKey = payment.status as keyof typeof STATUS_CONFIG
  const sc = STATUS_CONFIG[statusKey] || STATUS_CONFIG.cancelled
  const statusLabels: Record<string, string> = { completed: t.paid, paid: t.paid, pending: t.pending, failed: t.failed, refunded: t.refunded, cancelled: t.cancelled }
  const statusLabel = statusLabels[payment.status] || payment.status
  const mc = METHOD_CONFIG[method] || { icon: <Receipt size={18} />, color: '#64748b', bg: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: '#e2e8f0' }
  const phone = payment.clients?.phone || payment.client_phone || ''
  const paymentUrl = payment.payment_link || payment.payment_url || payment.link || ''
  const isPaid = payment.status === 'completed' || payment.status === 'paid'
  const isPendingCard = payment.status === 'pending' && (method === 'credit_card' || method === 'card')
  const initials = getInitials(clientName)

  const openWhatsApp = (message: string) => {
    if (!phone) { toast.error(isHe ? 'אין מספר טלפון' : 'Нет номера телефона'); return }
    window.open(`https://wa.me/972${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
  }
  const openSMS = (body?: string) => {
    if (!phone) { toast.error(isHe ? 'אין מספר טלפון' : 'Нет номера телефона'); return }
    window.open(body ? `sms:${phone.replace(/[^0-9]/g, '')}&body=${encodeURIComponent(body)}` : `sms:${phone.replace(/[^0-9]/g, '')}`, '_blank')
  }
  const copyLink = () => { if (paymentUrl) { navigator.clipboard.writeText(paymentUrl); toast.success(t.linkCopied) } }
  const downloadReceipt = () => window.open(`/api/payments/${payment.id}/receipt?locale=${locale}`, '_blank')
  const cancelPayment = async () => {
    const res = await fetch(`/api/payments/${payment.id}/cancel`, { method: 'POST' })
    if (res.ok) { toast.success(t.paymentCancelled); closeModal('payment-details'); queryClient.invalidateQueries({ queryKey: ['payments'] }) }
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Avatar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <div style={{ width: 54, height: 54, borderRadius: 16, background: `linear-gradient(135deg, ${sc.dot}, ${sc.color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 900, boxShadow: `0 6px 20px ${sc.dot}55` }}>
          {initials || <Receipt size={22} />}
        </div>
      </div>
      {/* Amount */}
      <div style={{ background: sc.bg, border: `0.5px solid ${sc.border}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: sc.color, letterSpacing: '-1px', lineHeight: 1 }}>₪{payment.amount}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{statusLabel}</span>
        </div>
      </div>
      {/* Method */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 10 }}>
        <span style={{ color: mc.color }}>{mc.icon}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{methodLabel}</span>
      </div>
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', marginBottom: 10 }} />

      {/* Action buttons */}
      {isPaid && phone && (
        <button onClick={() => openWhatsApp(isHe ? `קבלה: ${paymentUrl}` : `Квитанция: ${paymentUrl}`)}
          style={{ padding: '9px 10px', borderRadius: 9, border: 'none', background: 'rgba(34,197,94,0.15)', color: '#34d399', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <MessageCircle size={13} />{t.whatsappReceipt}
        </button>
      )}
      {isPaid && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 5 }}>
          {phone && <button onClick={() => openSMS()} style={{ padding: '8px 6px', borderRadius: 8, border: '0.5px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><MessageSquare size={12} />{t.smsReceipt}</button>}
          <button onClick={downloadReceipt} style={{ padding: '8px 6px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Download size={12} />{t.download}</button>
        </div>
      )}
      {isPendingCard && paymentUrl && (
        <>
          {phone && <button onClick={() => openWhatsApp(isHe ? `לתשלום: ${paymentUrl}` : `Ссылка оплаты: ${paymentUrl}`)} style={{ padding: '9px 10px', borderRadius: 9, border: 'none', background: 'rgba(34,197,94,0.15)', color: '#34d399', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><MessageCircle size={13} />{t.whatsappLink}</button>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 5 }}>
            {phone && <button onClick={() => openSMS(isHe ? `לתשלום: ${paymentUrl}` : `Ссылка: ${paymentUrl}`)} style={{ padding: '8px 6px', borderRadius: 8, border: '0.5px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><MessageSquare size={12} />{t.smsLink}</button>}
            <button onClick={copyLink} style={{ padding: '8px 6px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Copy size={12} />{t.copy}</button>
          </div>
          <button onClick={() => window.open(paymentUrl, '_blank')} style={{ padding: '8px 10px', borderRadius: 9, border: '0.5px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><ExternalLink size={13} />{t.openLink}</button>
          <button onClick={cancelPayment} style={{ padding: '8px 10px', borderRadius: 9, border: '0.5px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5 }}>{t.cancel}</button>
        </>
      )}
      {payment.status === 'pending' && !isPendingCard && (
        <button onClick={cancelPayment} style={{ padding: '9px 10px', borderRadius: 9, border: '0.5px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5 }}>{t.cancel}</button>
      )}
      <button onClick={() => closeModal('payment-details')} style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', marginTop: 2 }}>{t.close}</button>
    </div>
  )

  return (
    <Modal open={isOpen} onClose={() => closeModal('payment-details')} darkHeader showCloseButton={false} width="700px" dir={dir} contentClassName="!p-0">
      <TrinityModalShell open={isOpen} onClose={() => closeModal('payment-details')} icon={<Receipt />}
        title={clientName} subtitle={new Date(payment.created_at).toLocaleString(isHe ? 'he-IL' : 'ru-RU')}
        dir={dir} sidebarExtra={sidebar}>
        <div style={{ padding: '20px 18px 24px' }} className="space-y-4">

          {/* Amount hero */}
          <div style={{ background: `${sc.bg.replace('rgba', 'rgba').replace('0.12', '0.08')}`, border: `1px solid ${sc.border.replace('0.3', '0.2')}`, borderRadius: 16, padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: sc.color, letterSpacing: '-2px', lineHeight: 1, marginBottom: 8 }}>
              ₪{Number(payment.amount).toLocaleString()}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 20, background: `${sc.dot}20`, border: `1px solid ${sc.dot}40` }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc.dot }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: sc.color, letterSpacing: '0.05em' }}>{statusLabel}</span>
            </div>
          </div>

          {/* Info cards grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Method */}
            <div style={{ background: mc.bg, border: `1px solid ${mc.border}`, borderRadius: 14, padding: '12px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: mc.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t.method}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: mc.color }}>{mc.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{methodLabel}</span>
              </div>
            </div>
            {/* Date */}
            <div style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t.date}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }} dir="ltr">
                {new Date(payment.created_at).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }} dir="ltr">
                {new Date(payment.created_at).toLocaleTimeString(isHe ? 'he-IL' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Phone */}
          {phone && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{t.phone}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }} dir="ltr">{phone}</span>
            </div>
          )}

          {/* Description */}
          {payment.description && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{t.description}</p>
              <p style={{ fontSize: 13, color: '#78350f', margin: 0, lineHeight: 1.5 }}>{payment.description}</p>
            </div>
          )}

          {/* Type */}
          {payment.type && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{t.type}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{payment.type === 'service' ? t.service : payment.type}</span>
            </div>
          )}

          {/* ID */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600 }}>{t.id}:</span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#cbd5e1' }}>{payment.id?.substring(0, 8)}...</span>
          </div>

        </div>
      </TrinityModalShell>
    </Modal>
  )
}
