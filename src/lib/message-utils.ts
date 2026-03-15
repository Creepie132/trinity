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
 * Build a wa.me URL with optional pre-filled text from template.
 * phone should be raw digits (will be cleaned here).
 */
export function buildWhatsAppUrl(phone: string, text?: string): string {
  const clean = phone.replace(/[^0-9]/g, '')
  if (!text) return `https://wa.me/${clean}`
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`
}
