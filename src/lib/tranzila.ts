import crypto from 'crypto'

// ============================================================
// КОНСТАНТЫ
// ============================================================

const TRANZILA_CGI_URL =
  process.env.TRANZILA_API_URL ||
  'https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi'

// ============================================================
// HMAC АУТЕНТИФИКАЦИЯ — заголовки для Tranzila Billing REST API
//
// Формула:
//   msg  = PUBLIC KEY  (длинный)
//   key  = PRIVATE KEY (короткий) + timestamp + nonce
//   accessToken = HMAC_SHA256(key, msg).hex
// ============================================================

export function createTranzilaHeaders(publicKey: string, privateKey: string) {
  const timestamp = Math.round(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(40).toString('hex') // 80-символьный hex

  const accessToken = crypto
    .createHmac('sha256', privateKey + timestamp + nonce)
    .update(publicKey)
    .digest('hex')

  return {
    'X-tranzila-api-app-key': publicKey,
    'X-tranzila-api-request-time': timestamp,
    'X-tranzila-api-nonce': nonce,
    'X-tranzila-api-access-token': accessToken,
    'Content-Type': 'application/json',
  }
}

/** Генерирует заголовки из переменных окружения */
export function generateTranzilaHeaders() {
  const publicKey = process.env.TRANZILA_PUBLIC_KEY!
  const privateKey = process.env.TRANZILA_PRIVATE_KEY!
  return createTranzilaHeaders(publicKey, privateKey)
}

// ============================================================
// ШАГ 1 — ПЕРВЫЙ ПЛАТЁЖ
//
// После оплаты Tranzila возвращает TranzilaTK (токен карты).
// Токен сохраняется в organizations.tranzila_card_token
// и используется для всех следующих рекуррентных платежей.
// ============================================================

export async function createTranzilaPaymentLink({
  amount,
  description,
  paymentId,
  successUrl,
  failUrl,
  saveCard = true,
  customField2,
  terminal: terminalOverride,
  password: passwordOverride,
}: {
  amount: number
  description: string
  paymentId: string
  successUrl: string
  failUrl: string
  saveCard?: boolean
  customField2?: string
  // Опциональные переопределения (по умолчанию — из переменных окружения)
  terminal?: string
  password?: string
}) {
  const terminalId = terminalOverride || process.env.TRANZILA_TERMINAL_ID || ''
  const terminalPassword = passwordOverride || process.env.TRANZILA_TERMINAL_PASSWORD || ''

  if (!terminalId) {
    throw new Error('Tranzila terminal not configured for this organization')
  }

  const params = new URLSearchParams({
    supplier: terminalId,
    TranzilaPW: terminalPassword,
    sum: amount.toString(),
    currency: '1', // ILS
    pdesc: description,
    // AK = провести обычную транзакцию (A) + сохранить токен карты (K)
    // Tranzila вернёт TranzilaTK в success_url_address для дальнейших авто-списаний
    tranmode: saveCard ? 'AK' : 'A',
    success_url_address: successUrl,
    fail_url_address: failUrl,
    notify_url_address: failUrl,
    cField1: paymentId,
    lang: 'il',
  })

  if (customField2) {
    params.append('cField2', customField2)
  }

  const url = `https://direct.tranzila.com/${terminalId}/iframenew.php?${params.toString()}`

  return { url, transactionId: null }
}

// ============================================================
// ШАГ 2 — РЕКУРРЕНТНЫЙ ПЛАТЁЖ по сохранённому токену
//
// Токен был получен на Шаге 1 и хранится в organizations.
// Используется токен-терминал (TRANZILA_TOKEN_TERMINAL из .env).
// ============================================================

interface ChargeByTokenParams {
  token: string
  amount: number
  description: string
  expdate?: string // MMYY — требуется для некоторых транзакций
  // Опциональные переопределения (по умолчанию — из переменных окружения)
  terminal?: string
  password?: string
}

interface ChargeResult {
  transactionId: string
  last4: string
  approvalNumber: string
  response: string
}

export async function chargeByToken({
  token,
  amount,
  description,
  expdate,
  terminal: terminalOverride,
  password: passwordOverride,
}: ChargeByTokenParams): Promise<ChargeResult> {
  const terminal = terminalOverride || process.env.TRANZILA_TOKEN_TERMINAL || ''
  const password = passwordOverride || process.env.TRANZILA_TOKEN_PASSWORD || ''

  if (!terminal) {
    throw new Error('Tranzila token terminal not configured for this organization')
  }

  const params = new URLSearchParams({
    supplier: terminal,
    TranzilaPW: password,
    TranzilaTK: token,
    // tranmode=A — реальное списание (не верификация J5)
    tranmode: 'A',
    sum: amount.toFixed(2),
    currency: '1',
    pdesc: description,
    response_return_format: 'json',
  })

  if (expdate) {
    params.append('expdate', expdate)
  }



  const res = await fetch(TRANZILA_CGI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': 'https://www.ambersol.co.il',
      'Origin': 'https://www.ambersol.co.il',
    },
    body: params.toString(),
  })

  const text = await res.text()

  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Tranzila invalid response: ${text}`)
  }

  if (data.Response !== '000') {
    const errorMessages: Record<string, string> = {
      '001': 'Blocked card',
      '002': 'Stolen card',
      '003': 'Contact credit company',
      '004': 'Refusal',
      '005': 'Fake card',
      '006': 'CVV error',
      '033': 'Expired card',
      '036': 'Expired card',
      '039': 'Incorrect card number',
      '157': 'Card not permitted for this transaction',
    }
    const msg = errorMessages[data.Response] || data.error || 'Unknown error'
    throw new Error(`Tranzila error ${data.Response}: ${msg}`)
  }

  return {
    transactionId: data.ConfirmationCode || data.index || '',
    last4: data.cardnum || '',
    approvalNumber: data.ConfirmationCode || '',
    response: data.Response,
  }
}

// ============================================================
// ВСПОМОГАТЕЛЬНАЯ — проверка валидности токена без списания
// ============================================================

export async function validateToken({
  token,
  expdate,
}: {
  token: string
  expdate?: string
}): Promise<boolean> {
  const terminal = process.env.TRANZILA_TOKEN_TERMINAL || ''
  const password = process.env.TRANZILA_TOKEN_PASSWORD || ''

  if (!terminal) {
    return false
  }

  const params = new URLSearchParams({
    supplier: terminal,
    TranzilaPW: password,
    TranzilaTK: token,
    sum: '1',
    currency: '1',
    tranmode: 'V',
    response_return_format: 'json',
  })

  if (expdate) {
    params.append('expdate', expdate)
  }

  try {
    const res = await fetch(TRANZILA_CGI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    const data = await res.json()
    return data.Response === '000'
  } catch {
    return false
  }
}
