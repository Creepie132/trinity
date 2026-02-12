/**
 * Tranzilla Payment Gateway Integration
 * Terminal: ambersol (one-time payments)
 * Token Terminal: ambersoltok (recurring payments)
 * Docs: https://www.tranzilla.com/docs/
 */

interface TranzillaPaymentParams {
  amount: number
  currency?: string
  orderId: string
  successUrl?: string
  failUrl?: string
  notifyUrl?: string
  description?: string
}

interface TranzillaWebhookData {
  Response: string // '000' = success
  index?: string // Transaction ID
  sum?: string
  ccno?: string // Masked card number (last 4 digits)
  ConfirmationCode?: string
  tranmode?: string
  currency?: string
  PDFurl?: string
  [key: string]: any
}

// Production iframe URL
const TRANZILLA_IFRAME_URL = 'https://direct.tranzila.com/ambersol/iframenew.php'

/**
 * Generate payment link for Tranzilla hosted iframe
 * SECURITY: TranzilaPW is NOT included in public iframe URLs
 */
export function generateTranzillaPaymentLink(params: TranzillaPaymentParams): string {
  const terminalId = process.env.TRANZILLA_TERMINAL_ID || 'ambersol'
  
  const queryParams = new URLSearchParams({
    sum: params.amount.toFixed(2),
    currency: params.currency || '1', // 1 = ILS
    cred_type: '1', // Credit card
    lang: 'il', // Hebrew language
    contact: params.orderId,
  })

  // Add callback URLs if provided
  if (params.successUrl) {
    queryParams.set('success_url_address', params.successUrl)
  }
  if (params.failUrl) {
    queryParams.set('fail_url_address', params.failUrl)
  }
  if (params.notifyUrl) {
    queryParams.set('notify_url_address', params.notifyUrl)
  }

  if (params.description) {
    queryParams.set('remarks', params.description)
  }

  return `${TRANZILLA_IFRAME_URL}?${queryParams.toString()}`
}

/**
 * Verify Tranzilla webhook signature (if implemented)
 */
export function verifyTranzillaWebhook(data: any): boolean {
  // Tranzilla doesn't provide signature verification in basic integration
  // In production, verify IP whitelist or implement custom security
  return true
}

/**
 * Parse Tranzilla webhook response
 */
export function parseTranzillaWebhook(data: TranzillaWebhookData) {
  const isSuccess = data.Response === '000'
  
  return {
    success: isSuccess,
    transactionId: data.index || data.ConfirmationCode || null,
    amount: data.sum ? parseFloat(data.sum) : null,
    currency: data.currency || 'ILS',
    responseCode: data.Response,
    cardNumber: data.ccno || null, // Last 4 digits
    pdfUrl: data.PDFurl || null,
    rawData: data,
  }
}

/**
 * Generate tokenization request link (for recurring payments)
 * SECURITY: TranzilaPW is NOT included in public iframe URLs
 */
export function generateTranzillaTokenLink(params: TranzillaPaymentParams): string {
  const tokenTerminal = process.env.TRANZILLA_TOKEN_TERMINAL || 'ambersoltok'
  
  const queryParams = new URLSearchParams({
    sum: params.amount.toFixed(2),
    currency: params.currency || '1', // 1 = ILS
    cred_type: '1', // Credit card
    lang: 'il', // Hebrew language
    contact: params.orderId,
    create_token: '1', // Request token creation
  })

  // Add callback URLs if provided
  if (params.successUrl) {
    queryParams.set('success_url_address', params.successUrl)
  }
  if (params.failUrl) {
    queryParams.set('fail_url_address', params.failUrl)
  }
  if (params.notifyUrl) {
    queryParams.set('notify_url_address', params.notifyUrl)
  }

  if (params.description) {
    queryParams.set('remarks', params.description)
  }

  return `https://direct.tranzila.com/${tokenTerminal}/iframenew.php?${queryParams.toString()}`
}

/**
 * Format amount for Tranzilla (2 decimal places)
 */
export function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

/**
 * Get status from Tranzilla response code
 */
export function getPaymentStatus(responseCode: string): 'completed' | 'failed' {
  return responseCode === '000' ? 'completed' : 'failed'
}
