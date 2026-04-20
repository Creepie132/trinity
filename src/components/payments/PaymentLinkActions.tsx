'use client'

/**
 * PaymentLinkActions — Trinity CRM
 *
 * Универсальные кнопки действий с Tranzila-ссылкой на оплату:
 *  - Скопировать ссылку (Clipboard API + fallback на execCommand)
 *  - Открыть ссылку в новой вкладке
 *  - Отправить клиенту через WhatsApp (wa.me deep-link)
 *
 * Используется в:
 *  - PaymentDetailsDrawer (детали платежа)
 *  - SaleDetailModal (детали продажи со ссылкой)
 *
 * @version 1.0.0
 */

import { Copy, ExternalLink, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

export interface PaymentLinkActionsProps {
  /** Полный URL платёжной ссылки (Tranzila iframe URL) */
  paymentLink: string
  /** Телефон клиента в любом формате — нормализуется в 972xxxxxxxxx */
  clientPhone?: string | null
  /** Сумма платежа — вставляется в текст WA-сообщения */
  amount: number
  /** Язык UI — определяет тексты кнопок и сообщения клиенту */
  locale: 'he' | 'ru'
  /**
   * Визуальный вариант:
   *  - 'sidebar-dark' — тёмный sidebar (PaymentDetailsDrawer / SaleDetailModal desktop)
   *  - 'mobile-actions' — возвращает массив объектов для TrinityMobDetailShell.actions
   */
  variant?: 'sidebar-dark' | 'mobile-actions'
}

// ── Shared logic (used by both variants) ─────────────────────────────────────

type LinkMessages = {
  copyLink: string; openLink: string; sendLinkWa: string
  linkCopied: string; copyFailed: string; noPhone: string
}

function buildHandlers(paymentLink: string, clientPhone: string | null | undefined, amount: number, locale: 'he' | 'ru', L: LinkMessages) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink)
      toast.success(L.linkCopied)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = paymentLink; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy'); toast.success(L.linkCopied) }
      catch { toast.error(L.copyFailed) }
      finally { document.body.removeChild(ta) }
    }
  }

  const open = () => {
    window.open(paymentLink, '_blank', 'noopener,noreferrer')
  }

  const sendWA = () => {
    if (!clientPhone) { toast.error(L.noPhone); return }
    let clean = clientPhone.replace(/\D/g, '')
    if (clean.startsWith('0')) clean = clean.substring(1)
    if (!clean.startsWith('972')) clean = `972${clean}`
    const msg = locale === 'he'
      ? `קישור לתשלום ₪${amount.toFixed(2)}: ${paymentLink}`
      : `Ссылка для оплаты ₪${amount.toFixed(2)}: ${paymentLink}`
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')
  }

  return { copy, open, sendWA }
}

const LOCALES = {
  he: {
    copyLink: 'העתק קישור תשלום',
    openLink: 'פתח קישור תשלום',
    sendLinkWa: 'שלח קישור ב-WhatsApp',
    linkCopied: 'הקישור הועתק',
    copyFailed: 'שגיאה בהעתקה',
    noPhone: 'אין מספר טלפון',
  },
  ru: {
    copyLink: 'Скопировать ссылку',
    openLink: 'Открыть ссылку',
    sendLinkWa: 'Отправить ссылку в WA',
    linkCopied: 'Ссылка скопирована',
    copyFailed: 'Ошибка копирования',
    noPhone: 'Нет телефона',
  },
} as const

// ── Mobile actions export (for TrinityMobDetailShell.actions array) ──────────

/**
 * Строит массив action-объектов для мобильной шторки.
 * Не рендерит JSX — возвращает массив, который вызывающий код кладёт в actions.
 */
export function buildPaymentLinkMobileActions(
  props: Omit<PaymentLinkActionsProps, 'variant'>
): Array<{ icon: React.ReactNode; label: string; onClick: () => void; variant: 'blue' | 'green'; hidden?: boolean }> {
  const { paymentLink, clientPhone, amount, locale } = props
  const L = LOCALES[locale]
  const h = buildHandlers(paymentLink, clientPhone, amount, locale, L)
  return [
    { icon: <Copy size={13} />, label: L.copyLink, onClick: h.copy, variant: 'blue' },
    { icon: <ExternalLink size={13} />, label: L.openLink, onClick: h.open, variant: 'blue' },
    { icon: <MessageCircle size={13} />, label: L.sendLinkWa, onClick: h.sendWA, variant: 'green', hidden: !clientPhone },
  ]
}

// ── Sidebar variant (dark background — JSX buttons) ──────────────────────────

export function PaymentLinkActions(props: PaymentLinkActionsProps) {
  const { paymentLink, clientPhone, amount, locale, variant = 'sidebar-dark' } = props
  const L = LOCALES[locale]
  const h = buildHandlers(paymentLink, clientPhone, amount, locale, L)

  if (variant === 'mobile-actions') {
    // Каллер должен использовать buildPaymentLinkMobileActions() вместо JSX
    return null
  }

  // sidebar-dark
  const btnBase: React.CSSProperties = {
    padding: '9px 10px', borderRadius: 9, fontSize: 11, fontWeight: 600,
    cursor: 'pointer', marginBottom: 5, display: 'flex',
    alignItems: 'center', justifyContent: 'center', gap: 5, width: '100%',
  }
  return (
    <>
      <button onClick={h.copy}
        style={{ ...btnBase, border: '0.5px solid rgba(129,140,248,0.3)', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}>
        <Copy size={13} />{L.copyLink}
      </button>
      <button onClick={h.open}
        style={{ ...btnBase, border: '0.5px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.12)', color: '#c4b5fd' }}>
        <ExternalLink size={13} />{L.openLink}
      </button>
      {clientPhone && (
        <button onClick={h.sendWA}
          style={{ ...btnBase, border: '0.5px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.15)', color: '#34d399' }}>
          <MessageCircle size={13} />{L.sendLinkWa}
        </button>
      )}
    </>
  )
}
