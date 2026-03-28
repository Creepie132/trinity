'use client'

/**
 * PaymentSuccessView — эталонный экран успешного платежа Trinity.
 *
 * Используется в:
 *   - UnifiedPaymentDialog (страница Платежи)
 *   - UnifiedSalesDialog (создание сделки → оплата картой)
 *   - ClientDetailsModal (оплата из карточки клиента)
 *
 * Props:
 *   - paymentLink: если передана — показывает ссылку + кнопки
 *   - amount: сумма для отображения
 *   - clientPhone: для кнопки WhatsApp
 *   - onClose: закрыть диалог
 *   - locale: 'he' | 'ru'
 */

import { useState } from 'react'
import { CheckCircle2, Copy, ExternalLink, MessageCircle } from 'lucide-react'

interface PaymentSuccessViewProps {
  paymentLink?: string | null
  amount?: number
  clientPhone?: string | null
  onClose: () => void
  locale: 'he' | 'ru'
}

const T = {
  he: {
    successLink: '✓ הקישור לתשלום נוצר!',
    successCash: '✓ התשלום נרשם בהצלחה',
    sendToClient: 'שלח ללקוח לתשלום מאובטח',
    copy: 'העתק',
    copied: 'הועתק!',
    openLink: 'פתח קישור תשלום',
    close: 'סגור',
    waMsg: (link: string) => `קישור לתשלום: ${link}`,
  },
  ru: {
    successLink: '✓ Ссылка на оплату создана!',
    successCash: '✓ Платёж успешно записан',
    sendToClient: 'Отправьте клиенту для безопасной оплаты',
    copy: 'Скопировать',
    copied: 'Скопировано!',
    openLink: 'Открыть ссылку оплаты',
    close: 'Закрыть',
    waMsg: (link: string) => `Ссылка для оплаты: ${link}`,
  },
}

export function PaymentSuccessView({
  paymentLink, amount, clientPhone, onClose, locale,
}: PaymentSuccessViewProps) {
  const t = T[locale] ?? T.ru
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!paymentLink) return
    navigator.clipboard.writeText(paymentLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    if (!paymentLink || !clientPhone) return
    let p = clientPhone.replace(/\D/g, '')
    if (p.startsWith('0')) p = p.slice(1)
    window.open(`https://wa.me/972${p}?text=${encodeURIComponent(t.waMsg(paymentLink))}`, '_blank')
  }

  return (
    <div style={{ padding: '20px 18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Зелёная плашка */}
      <div style={{
        background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
        border: '1px solid #bbf7d0',
        borderRadius: 16, padding: 20, textAlign: 'center',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg,#22c55e,#16a34a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
          boxShadow: '0 6px 16px rgba(34,197,94,0.3)',
        }}>
          <CheckCircle2 size={24} color="#fff" />
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#15803d', margin: '0 0 4px' }}>
          {paymentLink ? t.successLink : t.successCash}
        </p>
        {paymentLink && (
          <p style={{ fontSize: 12, color: '#16a34a', margin: 0 }}>{t.sendToClient}</p>
        )}
        {!paymentLink && amount != null && amount > 0 && (
          <p style={{ fontSize: 24, fontWeight: 900, color: '#16a34a', margin: '8px 0 0' }}>
            ₪{amount.toLocaleString()}
          </p>
        )}
      </div>

      {/* Ссылка + кнопка копирования */}
      {paymentLink && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            readOnly value={paymentLink} dir="ltr"
            style={{
              flex: 1, fontSize: 12, padding: '9px 12px',
              border: '1px solid #e2e8f0', borderRadius: 10,
              background: '#f8fafc', color: '#475569',
              outline: 'none', minWidth: 0,
            }}
          />
          <button
            onClick={handleCopy}
            style={{
              flexShrink: 0, padding: '9px 14px', borderRadius: 10,
              border: '1px solid #e2e8f0',
              background: copied ? '#f0fdf4' : '#fff',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              color: copied ? '#16a34a' : '#475569',
              whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.2s',
            }}
          >
            {copied ? <CheckCircle2 size={13}/> : <Copy size={13}/>}
            {copied ? t.copied : t.copy}
          </button>
        </div>
      )}

      {/* Кнопки действий */}
      {paymentLink && (
        <button
          onClick={() => window.open(paymentLink, '_blank')}
          style={{
            width: '100%', padding: '11px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <ExternalLink size={14}/>{t.openLink}
        </button>
      )}

      {paymentLink && clientPhone && (
        <button
          onClick={handleWhatsApp}
          style={{
            width: '100%', padding: '10px', borderRadius: 10,
            border: '1px solid #bbf7d0', background: '#f0fdf4',
            color: '#16a34a', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <MessageCircle size={14}/>WhatsApp
        </button>
      )}
    </div>
  )
}

// ─── Sidebar кнопки для success состояния (в TrinityModalShell sidebar) ───────

interface PaymentSuccessSidebarProps {
  paymentLink?: string | null
  clientPhone?: string | null
  onClose: () => void
  locale: 'he' | 'ru'
}

const TS = {
  he: {
    openLink: 'פתח קישור',
    close: 'סגור',
    waMsg: (link: string) => `קישור לתשלום: ${link}`,
  },
  ru: {
    openLink: 'Открыть ссылку',
    close: 'Закрыть',
    waMsg: (link: string) => `Ссылка для оплаты: ${link}`,
  },
}

export function PaymentSuccessSidebar({
  paymentLink, clientPhone, onClose, locale,
}: PaymentSuccessSidebarProps) {
  const t = TS[locale] ?? TS.ru

  const handleWhatsApp = () => {
    if (!paymentLink || !clientPhone) return
    let p = clientPhone.replace(/\D/g, '')
    if (p.startsWith('0')) p = p.slice(1)
    window.open(`https://wa.me/972${p}?text=${encodeURIComponent(t.waMsg(paymentLink))}`, '_blank')
  }

  return (
    <>
      {paymentLink && (
        <>
          <button
            onClick={() => window.open(paymentLink, '_blank')}
            style={{
              padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              width: '100%', marginBottom: 6,
              background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <ExternalLink size={14}/>{t.openLink}
          </button>
          {clientPhone && (
            <button
              onClick={handleWhatsApp}
              style={{
                padding: '9px 14px', borderRadius: 10,
                border: '0.5px solid rgba(34,197,94,0.3)',
                background: 'rgba(34,197,94,0.1)',
                cursor: 'pointer', width: '100%', color: '#34d399',
                fontSize: 12, fontWeight: 600, marginBottom: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <MessageCircle size={13}/>WhatsApp
            </button>
          )}
        </>
      )}
      <button
        onClick={onClose}
        style={{
          padding: '8px 14px', borderRadius: 9,
          border: '0.5px solid rgba(255,255,255,0.12)',
          background: 'transparent', color: 'rgba(255,255,255,0.4)',
          fontSize: 12, cursor: 'pointer', width: '100%',
        }}
      >
        {t.close}
      </button>
    </>
  )
}
