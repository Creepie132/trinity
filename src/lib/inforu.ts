/**
 * InforU Mobile SMS API Integration
 * Docs: https://www.inforu.co.il/api
 */

interface SmsRecipient {
  Phone: string
  ClientId?: string
}

interface SendSmsParams {
  message: string
  recipients: SmsRecipient[]
  senderName?: string
}

interface SendSmsResponse {
  success: boolean
  messageId?: string
  error?: string
  results?: Array<{
    phone: string
    success: boolean
    error?: string
  }>
}

const INFORU_API_URL = 'https://api.inforu.co.il/SendSMS'

/**
 * Send SMS via InforU Mobile API
 */
export async function sendSms(params: SendSmsParams): Promise<SendSmsResponse> {
  const apiToken = process.env.INFORU_API_TOKEN
  const senderName = params.senderName || process.env.INFORU_SENDER_NAME || 'Trinity'

  if (!apiToken) {
    throw new Error('INFORU_API_TOKEN not configured')
  }

  try {
    const response = await fetch(INFORU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        Message: params.message,
        Recipients: params.recipients.map((r) => ({
          Phone: formatPhoneNumber(r.Phone),
        })),
        Settings: {
          SenderName: senderName,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`InforU API error: ${error}`)
    }

    const data = await response.json()

    // Parse response and map to our format
    return {
      success: true,
      messageId: data.MessageId || data.Id,
      results: params.recipients.map((r, i) => ({
        phone: r.Phone,
        success: true, // InforU typically returns success unless there's a general error
        error: undefined,
      })),
    }
  } catch (error: any) {
    console.error('InforU SMS error:', error)
    return {
      success: false,
      error: error.message,
      results: params.recipients.map((r) => ({
        phone: r.Phone,
        success: false,
        error: error.message,
      })),
    }
  }
}

/**
 * Format phone number for InforU (Israeli format)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')

  // If starts with 972, keep it
  if (cleaned.startsWith('972')) {
    return '+' + cleaned
  }

  // If starts with 0, replace with 972
  if (cleaned.startsWith('0')) {
    return '+972' + cleaned.substring(1)
  }

  // Otherwise, assume it's a local number without prefix
  return '+972' + cleaned
}

/**
 * Calculate SMS parts (160 chars = 1 SMS, 153 chars for multi-part)
 */
export function calculateSmsParts(message: string): number {
  const length = message.length

  if (length === 0) return 0
  if (length <= 160) return 1

  // Multi-part SMS: 153 chars per part
  return Math.ceil(length / 153)
}

/**
 * Validate phone number
 */
export function isValidIsraeliPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')

  // Israeli mobile numbers: 972-5X-XXX-XXXX or 05X-XXX-XXXX
  if (cleaned.startsWith('972')) {
    return cleaned.length === 12 && cleaned[3] === '5'
  }

  if (cleaned.startsWith('0')) {
    return cleaned.length === 10 && cleaned[1] === '5'
  }

  // Local format without prefix
  return cleaned.length === 9 && cleaned[0] === '5'
}

/**
 * Sanitize message (remove special chars that might break SMS)
 */
export function sanitizeMessage(message: string): string {
  // Remove control characters but keep newlines and Hebrew
  return message.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '')
}
