/**
 * Message template utilities for WhatsApp and SMS
 *
 * Supported variables:
 *   {client_name}   — full name of the client
 *   {org_name}      — organization name
 *   {visit_ref}     — visit reference: date + time + service (only present fields)
 *   {product_ref}   — product/item name
 */

export interface MessageVars {
  client_name?: string
  org_name?: string
  visit_ref?: string   // pre-built by caller (see buildVisitRef)
  product_ref?: string
}

/** Replace template variables with actual values. Missing vars are replaced with '' */
export function buildMessage(template: string, vars: MessageVars): string {
  if (!template) return ''
  return template
    .replace(/\{client_name\}/g, vars.client_name ?? '')
    .replace(/\{org_name\}/g, vars.org_name ?? '')
    .replace(/\{visit_ref\}/g, vars.visit_ref ?? '')
    .replace(/\{product_ref\}/g, vars.product_ref ?? '')
    .trim()
}

/**
 * Build a human-readable visit reference string.
 * Only includes fields that are present.
 * Example: "01/12/2025 14:30 — Стрижка"
 */
export function buildVisitRef(opts: {
  date?: string | null
  time?: string | null
  service?: string | null
  locale?: 'he' | 'ru'
}): string {
  const parts: string[] = []

  if (opts.date) {
    try {
      const d = new Date(opts.date)
      parts.push(d.toLocaleDateString(opts.locale === 'he' ? 'he-IL' : 'ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }))
    } catch {
      parts.push(opts.date)
    }
  }

  if (opts.time) {
    parts.push(opts.time)
  }

  if (opts.service) {
    parts.push(opts.service)
  }

  return parts.join(' — ')
}

/**
 * Build a WhatsApp URL with optional pre-filled text.
 * On mobile: uses wa.me deep link (opens app directly).
 * On desktop: uses web.whatsapp.com/send (avoids blank screen on wa.me).
 * phone should be raw digits or Israeli format (normalized here to 972xxx).
 */
export function buildWhatsAppUrl(phone: string, text?: string): string {
  const digits = phone.replace(/[^0-9]/g, '')
  // Normalize Israeli numbers: 05x → 9725x
  const clean = digits.startsWith('972')
    ? digits
    : digits.startsWith('0')
    ? '972' + digits.slice(1)
    : '972' + digits

  const isMobile = typeof navigator !== 'undefined'
    && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  if (isMobile) {
    return text
      ? `https://wa.me/${clean}?text=${encodeURIComponent(text)}`
      : `https://wa.me/${clean}`
  }
  // Desktop: web.whatsapp.com/send works better than wa.me in browser
  const base = `https://web.whatsapp.com/send?phone=${clean}`
  return text ? `${base}&text=${encodeURIComponent(text)}` : base
}
