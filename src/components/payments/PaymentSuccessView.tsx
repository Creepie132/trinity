'use client'

/**
 * PaymentSuccessView — эталонный экран успешного платежа Trinity.
 *
 * Используется в:
 *   - UnifiedPaymentDialog (все методы)
 *   - UnifiedSalesDialog (после сохранения сделки)
 *   - ClientDetailsModal (оплата из карточки клиента)
 *
 * Props:
 *   - paymentLink: если передана — показывает ссылку + кнопки (метод link/card)
 *   - isCash: показывает CTA для наличных (WhatsApp квитанция + печать)
 *   - amount, changeAmount: сумма и сдача для квитанции
 *   - clientPhone: для кнопки WhatsApp
 *   - clientName: для квитанции
 *   - onClose: закрыть диалог
 *   - locale: 'he' | 'ru'
 */

import { useState } from 'react'
import { CheckCircle2, Copy, ExternalLink, MessageCircle, Printer } from 'lucide-react'

interface PaymentSuccessViewProps {
  paymentLink?: string | null
  isCash?: boolean
  amount?: number
  changeAmount?: number        // Сдача — показывается для наличных
  clientPhone?: string | null
  clientName?: string | null
  onClose: () => void
  locale: 'he' | 'ru'
}

const T = {
  he: {
    successLink: '✓ הקישור לתשלום נוצר!',
    successCash: '✓ התשלום במזומן נרשם!',
    successDefault: '✓ התשלום נרשם בהצלחה',
    sendToClient: 'שלח ללקוח לתשלום מאובטח',
    change: 'עודף ללקוח',
    copy: 'העתק',
    copied: 'הועתק!',
    openLink: 'פתח קישור תשלום',
    close: 'סגור',
    printReceipt: 'הדפס קבלה',
    sendReceiptWA: 'שלח קבלה ב-WhatsApp',
    waReceiptMsg: (amount: number, change: number, name: string) =>
      `קבלה על תשלום במזומן\nלקוח: ${name}\nסכום: ₪${amount.toFixed(2)}${change > 0 ? `\nעודף: ₪${change.toFixed(2)}` : ''}\nתאריך: ${new Date().toLocaleDateString('he-IL')}`,
    waMsg: (link: string) => `קישור לתשלום: ${link}`,
  },
  ru: {
    successLink: '✓ Ссылка на оплату создана!',
    successCash: '✓ Наличный платёж записан!',
    successDefault: '✓ Платёж успешно записан',
    sendToClient: 'Отправьте клиенту для безопасной оплаты',
    change: 'Сдача клиенту',
    copy: 'Скопировать',
    copied: 'Скопировано!',
    openLink: 'Открыть ссылку оплаты',
    close: 'Закрыть',
    printReceipt: 'Распечатать квитанцию',
    sendReceiptWA: 'Квитанция в WhatsApp',
    waReceiptMsg: (amount: number, change: number, name: string) =>
      `Квитанция об оплате наличными\nКлиент: ${name}\nСумма: ₪${amount.toFixed(2)}${change > 0 ? `\nСдача: ₪${change.toFixed(2)}` : ''}\nДата: ${new Date().toLocaleDateString('ru-RU')}`,
    waMsg: (link: string) => `Ссылка для оплаты: ${link}`,
  },
}

export function PaymentSuccessView({
  paymentLink, isCash, amount, changeAmount, clientPhone, clientName, onClose, locale,
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
    if (!clientPhone) return
    let p = clientPhone.replace(/\D/g, '')
    if (p.startsWith('0')) p = p.slice(1)
    const msg = paymentLink
      ? t.waMsg(paymentLink)
      : t.waReceiptMsg(amount ?? 0, changeAmount ?? 0, clientName ?? '')
    window.open(`https://wa.me/972${p}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handlePrint = () => {
    const printContent = `
      <html><head><title>Receipt</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;max-width:320px}
      h2{margin:0 0 16px;font-size:18px}
      .row{display:flex;justify-content:space-between;margin:6px 0;font-size:14px}
      .total{font-size:20px;font-weight:900;color:#15803d}
      .change{font-size:16px;font-weight:700;color:#16a34a}
      .divider{border:none;border-top:1px dashed #ccc;margin:12px 0}
      </style></head><body>
      <h2>🧾 ${locale === 'he' ? 'קבלה' : 'Квитанция'}</h2>
      <hr class="divider"/>
      ${clientName ? `<div class="row"><span>${locale === 'he' ? 'לקוח' : 'Клиент'}</span><span>${clientName}</span></div>` : ''}
      <div class="row"><span>${locale === 'he' ? 'סכום' : 'Сумма'}</span><span class="total">₪${(amount ?? 0).toFixed(2)}</span></div>
      ${changeAmount && changeAmount > 0 ? `<div class="row"><span>${locale === 'he' ? 'עודף' : 'Сдача'}</span><span class="change">₪${changeAmount.toFixed(2)}</span></div>` : ''}
      <hr class="divider"/>
      <div class="row" style="font-size:12px;color:#666"><span>${locale === 'he' ? 'תאריך' : 'Дата'}</span><span>${new Date().toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}</span></div>
      <div class="row" style="font-size:12px;color:#666"><span>${locale === 'he' ? 'שיטת תשלום' : 'Метод оплаты'}</span><span>${locale === 'he' ? 'מזומן' : 'Наличные'}</span></div>
      </body></html>
    `
    const win = window.open('', '_blank', 'width=400,height=500')
    if (win) {
      win.document.write(printContent)
      win.document.close()
      win.focus()
      win.print()
      win.close()
    }
  }

  const successTitle = paymentLink
    ? t.successLink
    : isCash
    ? t.successCash
    : t.successDefault

  return (
    <div style={{ padding: '20px 18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Зелёная плашка */}
      <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1px solid #bbf7d0', borderRadius: 16, padding: 20, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 6px 16px rgba(34,197,94,0.3)' }}>
          <CheckCircle2 size={24} color="#fff" />
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#15803d', margin: '0 0 4px' }}>{successTitle}</p>
        {paymentLink && <p style={{ fontSize: 12, color: '#16a34a', margin: 0 }}>{t.sendToClient}</p>}

        {/* Сдача — крупно */}
        {isCash && amount != null && amount > 0 && (
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                {locale === 'he' ? 'סכום' : 'Сумма'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#15803d' }}>₪{amount.toFixed(2)}</div>
            </div>
            {changeAmount != null && changeAmount > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{t.change}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#0369a1' }}>₪{changeAmount.toFixed(2)}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ссылка + копирование (для link/card методов) */}
      {paymentLink && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input readOnly value={paymentLink} dir="ltr" style={{ flex: 1, fontSize: 12, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', color: '#475569', outline: 'none', minWidth: 0 }} />
          <button onClick={handleCopy} style={{ flexShrink: 0, padding: '9px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: copied ? '#f0fdf4' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: copied ? '#16a34a' : '#475569', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s' }}>
            {copied ? <CheckCircle2 size={13}/> : <Copy size={13}/>}
            {copied ? t.copied : t.copy}
          </button>
        </div>
      )}

      {/* CTA для наличных: WhatsApp квитанция + Печать */}
      {isCash && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clientPhone && (
            <button onClick={handleWhatsApp} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <MessageCircle size={14}/>{t.sendReceiptWA}
            </button>
          )}
          <button onClick={handlePrint} style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Printer size={14}/>{t.printReceipt}
          </button>
        </div>
      )}

      {/* CTA для link/card */}
      {paymentLink && (
        <>
          <button onClick={() => window.open(paymentLink, '_blank')} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ExternalLink size={14}/>{t.openLink}
          </button>
          {clientPhone && (
            <button onClick={handleWhatsApp} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <MessageCircle size={14}/>WhatsApp
            </button>
          )}
        </>
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
