import { Resend } from 'resend'
import crypto from 'crypto'

// Use a placeholder key if RESEND_API_KEY is missing (for build-time)
export const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key_for_build')

// Стандартные заголовки для улучшения deliverability
export function getEmailHeaders() {
  return {
    'X-Entity-Ref-ID': crypto.randomUUID(),
  }
}

// Стандартные теги
export function getEmailTags(category: string = 'transactional') {
  return [
    { name: 'category', value: category }
  ]
}
