/**
 * Tranzilla Payment Gateway Integration
 * Docs: https://www.tranzilla.com/docs/
 */

interface TranzillaPaymentParams {
  amount: number
  currency?: string
  orderId: string
  callbackUrl: string
  description?: string
}

interface TranzillaWebhookData {
  Response: string // '000' = success
  ConfirmationCode?: string
  tranmode?: string
  sum?: string
  currency?: string
  PDFurl?: string
  [key: string]: any
}

const TRANZILLA_API_URL = 'https://sandbox.tranzilla.co.il/cgi-bin/tranzilla71u.cgi'

/**
 * Generate payment link for Tranzilla hosted page
 */
export function generateTranzillaPaymentLink(params: TranzillaPaymentParams): string {
  const terminalId = process.env.TRANZILLA_TERMINAL_ID || 'sandbox'
  
  const queryParams = new URLSearchParams({
    supplier: terminalId,
    sum: params.amount.toFixed(2),
    currency: params.currency || '1', // 1 = ILS
    cred_type: '1', // Credit card
    tranmode: 'A', // Authorization + Capture
    nologo: '1',
    lang: 'he',
    TranzilaPW: process.env.TRANZILLA_API_KEY || '',
    contact: params.orderId,
    // Success/Fail redirects
    success_url_address: params.callbackUrl + '?status=success',
    fail_url_address: params.callbackUrl + '?status=failed',
    // Webhook notification
    notify_url_address: params.callbackUrl.replace('/callback', '/webhook'),
  })

  if (params.description) {
    queryParams.set('remarks', params.description)
  }

  return `${TRANZILLA_API_URL}?${queryParams.toString()}`
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
    transactionId: data.ConfirmationCode || null,
    amount: data.sum ? parseFloat(data.sum) : null,
    currency: data.currency || 'ILS',
    responseCode: data.Response,
    pdfUrl: data.PDFurl || null,
    rawData: data,
  }
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
