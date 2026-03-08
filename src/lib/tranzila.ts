import crypto from 'crypto'

export async function createTranzilaPaymentLink({
  amount,
  description,
  paymentId,
  successUrl,
  failUrl,
  terminal,
  password,
}: {
  amount: number
  description: string
  paymentId: string
  successUrl: string
  failUrl: string
  terminal?: string
  password?: string
}) {
  const terminalId = terminal || process.env.TRANZILA_TERMINAL_ID
  const terminalPassword = password || process.env.TRANZILA_TERMINAL_PASSWORD

  const params = new URLSearchParams({
    supplier: terminalId!,
    TranzilaPW: terminalPassword!,
    sum: amount.toString(),
    currency: '1', // ILS
    description: description,
    tranmode: 'A',
    success_url: successUrl,
    fail_url: failUrl,
    notify_url: failUrl,
    cField1: paymentId,
    lang: 'il',
  })

  const paymentLink = `https://direct.tranzila.com/${terminalId}/iframenew.php?${params.toString()}`

  return {
    url: paymentLink,
    transactionId: null,
  }
}

// Генерация заголовков для Tranzila Billing API
export function generateTranzilaHeaders() {
  const appKey = process.env.TRANZILA_BILLING_APP_KEY!
  const secret = process.env.TRANZILA_BILLING_SECRET!
  const requestTime = Date.now()
  const nonce = crypto.randomBytes(40).toString('hex')

  const accessToken = crypto
    .createHmac('sha256', secret)
    .update(appKey + requestTime + nonce)
    .digest('hex')

  return {
    'X-tranzila-api-app-key': appKey,
    'X-tranzila-api-request-time': requestTime.toString(),
    'X-tranzila-api-nonce': nonce,
    'X-tranzila-api-access-token': accessToken,
    'Content-Type': 'application/json',
  }
}
