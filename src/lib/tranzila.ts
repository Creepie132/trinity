import crypto from 'crypto'

// ============================================
// АУТЕНТИФИКАЦИЯ — заголовки для Tranzila API
// ============================================

/**
 * Создаёт заголовки для Tranzila REST API
 * Формула: HMAC_SHA256(message=publicKey, key=privateKey+timestamp+nonce)
 */
export function createTranzilaHeaders(publicKey: string, privateKey: string) {
  const timestamp = Math.round(Date.now() / 1000) // Unix timestamp в секундах
  const nonce = crypto.randomBytes(40).toString('hex') // 80 символов hex

  const accessToken = crypto
    .createHmac('sha256', privateKey + timestamp + nonce)
    .update(publicKey)
    .digest('hex')

  return {
    'X-tranzila-api-app-key': publicKey,
    'X-tranzila-api-request-time': timestamp.toString(),
    'X-tranzila-api-nonce': nonce,
    'X-tranzila-api-access-token': accessToken,
    'Content-Type': 'application/json',
  }
}

export async function createTranzilaPaymentLink({
  amount,
  description,
  paymentId,
  successUrl,
  failUrl,
  terminal,
  password,
  saveCard,
  customField2,
}: {
  amount: number
  description: string
  paymentId: string
  successUrl: string
  failUrl: string
  terminal?: string
  password?: string
  saveCard?: boolean // Запросить токенизацию карты (TranzilaTK)
  customField2?: string // Доп. поле для передачи типа платежа
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

  // Запрос токенизации карты для рекуррентных платежей
  if (saveCard) {
    params.append('tranzilaTK', '1') // Tranzila вернёт токен карты
  }

  // Доп. поле для идентификации типа платежа
  if (customField2) {
    params.append('cField2', customField2)
  }

  const paymentLink = `https://direct.tranzila.com/${terminalId}/iframenew.php?${params.toString()}`

  return {
    url: paymentLink,
    transactionId: null,
  }
}

// Генерация заголовков для Tranzila Billing API (legacy — использует env vars)
export function generateTranzilaHeaders() {
  const publicKey = process.env.TRANZILA_PUBLIC_KEY || process.env.TRANZILA_BILLING_APP_KEY!
  const privateKey = process.env.TRANZILA_PRIVATE_KEY || process.env.TRANZILA_BILLING_SECRET!
  return createTranzilaHeaders(publicKey, privateKey)
}

// ============================================
// РЕКУРРЕНТНЫЕ ПЛАТЕЖИ — списание по токену карты
// ============================================

interface ChargeByTokenParams {
  token: string
  amount: number
  description: string
  terminal?: string
  password?: string
  expdate?: string // MMYY format
}

interface ChargeResult {
  transactionId: string
  last4: string
  approvalNumber: string
  response: string
}

/**
 * Списание по сохранённому токену карты (TranzilaTK)
 * Используется для рекуррентных платежей подписок
 * Для токенов используется отдельный терминал ambersolttok
 */
export async function chargeByToken({
  token,
  amount,
  description,
  terminal = process.env.TRANZILA_TOKEN_TERMINAL || process.env.TRANZILA_TERMINAL_ID || 'ambersolttok',
  password = process.env.TRANZILA_PRIVATE_KEY || process.env.TRANZILA_PASSWORD!,
  expdate,
}: ChargeByTokenParams): Promise<ChargeResult> {
  const apiUrl = process.env.TRANZILA_API_URL || 'https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi'

  const params = new URLSearchParams({
    supplier: terminal,
    TranzilaPW: password,
    TranzilaTK: token,
    tranmode: 'V', // Verified charge
    sum: amount.toFixed(2),
    currency: '1', // ILS
    pdesc: description,
    response_return_format: 'json',
  })

  // Добавляем expdate если есть (требуется для некоторых транзакций)
  if (expdate) {
    params.append('expdate', expdate)
  }

  console.log('[Tranzila] Charging token:', {
    terminal,
    amount,
    description,
    tokenLast4: token.slice(-4),
  })

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const text = await res.text()
  console.log('[Tranzila] Raw response:', text)

  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    // Tranzila иногда возвращает не JSON
    throw new Error(`Tranzila invalid response: ${text}`)
  }

  // Tranzila возвращает Response=000 при успехе
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
    const errorMsg = errorMessages[data.Response] || data.error || 'Unknown error'
    throw new Error(`Tranzila error ${data.Response}: ${errorMsg}`)
  }

  return {
    transactionId: data.ConfirmationCode || data.index,
    last4: data.cardnum || '',
    approvalNumber: data.ConfirmationCode || '',
    response: data.Response,
  }
}

/**
 * Проверка валидности токена (без списания)
 * sum=1 с tranmode=V делает проверку без реального списания
 */
export async function validateToken({
  token,
  terminal = process.env.TRANZILA_TOKEN_TERMINAL || 'ambersolttok',
  password = process.env.TRANZILA_PASSWORD!,
  expdate,
}: {
  token: string
  terminal?: string
  password?: string
  expdate?: string
}): Promise<boolean> {
  const apiUrl = process.env.TRANZILA_API_URL || 'https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi'

  const params = new URLSearchParams({
    supplier: terminal,
    TranzilaPW: password,
    TranzilaTK: token,
    sum: '1',
    currency: '1',
    tranmode: 'V', // Verification only
    response_return_format: 'json',
  })

  if (expdate) {
    params.append('expdate', expdate)
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const data = await res.json()
    return data.Response === '000'
  } catch {
    return false
  }
}
