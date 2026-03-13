import crypto from 'crypto'

// ============================================================
// HMAC АУТЕНТИФИКАЦИЯ — для Tranzila REST API (если понадобится)
// ============================================================

export function createTranzilaHeaders(publicKey: string, privateKey: string) {
  const timestamp = Math.round(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(40).toString('hex')

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

export function generateTranzilaHeaders() {
  const publicKey = process.env.TRANZILA_PUBLIC_KEY!
  const privateKey = process.env.TRANZILA_PRIVATE_KEY!
  return createTranzilaHeaders(publicKey, privateKey)
}

// ============================================================
// ПОДПИСКА — первый платёж через iFrame DirectNG
//
// Tranzila My Billing автоматически списывает каждый месяц.
// Нам не нужны CGI-запросы или токены — всё делает Tranzila.
//
// Параметры:
//   sum            — первый платёж (например, за первый месяц)
//   recur_sum      — сумма каждого следующего месяца
//   recur_transaction=4_approved — ежемесячно, без выбора пользователя
//   recur_payments — кол-во платежей (не передаём = бесконечно)
//   notify_url_address — Tranzila шлёт POST при каждом списании
// ============================================================

export function createSubscriptionPaymentUrl({
  amount,
  orgId,
  orgName,
  ownerEmail,
  notifyUrl,
  successUrl,
  failUrl,
}: {
  amount: number
  orgId: string
  orgName: string
  ownerEmail?: string
  notifyUrl: string
  successUrl: string
  failUrl: string
}): string {
  const terminal = process.env.TRANZILA_TERMINAL_ID || ''
  const password = process.env.TRANZILA_TERMINAL_PASSWORD || ''

  if (!terminal) {
    throw new Error('Tranzila terminal not configured')
  }

  // DCdisable — уникальный ID для защиты от дублей.
  // Tranzila блокирует повторный платёж с тем же DCdisable в течение 24 часов.
  // Формат: org_id (без дефисов) + YYYYMM — уникален на месяц.
  const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '')
  const dcDisable = `${orgId.replace(/-/g, '')}${yearMonth}`

  const params = new URLSearchParams({
    TranzilaPW: password,
    sum: amount.toFixed(2),
    currency: '1', // ILS
    pdesc: `Trinity CRM — ${orgName}`,
    lang: 'il',
    // My Billing: ежемесячно, автоматически, без выбора пользователя
    recur_transaction: '4_approved',
    recur_sum: amount.toFixed(2),
    // success/fail/notify URLs
    success_url_address: successUrl,
    fail_url_address: failUrl,
    notify_url_address: notifyUrl,
    // org_id передаём через cField1 — придёт в callback
    cField1: orgId,
    // Защита от дублей: Tranzila блокирует повторный платёж с тем же DCdisable
    // Требует настройки поля 20 в my.tranzila → Настройки → שדות נוספים לעסקה
    DCdisable: dcDisable,
    // Email клиента — Tranzila отправит квитанцию автоматически после оплаты
    ...(ownerEmail ? { contact_email: ownerEmail } : {}),
  })

  // DirectNG — новый актуальный URL (не direct.tranzila.com!)
  return `https://directng.tranzila.com/${terminal}/iframenew.php?${params.toString()}`
}

// ============================================================
// ОБЫЧНЫЙ ПЛАТЁЖ клиента (не подписка) — iFrame без рекуррента
// Используется в /api/payments/create-link
// ============================================================

export async function createTranzilaPaymentLink({
  amount,
  description,
  paymentId,
  successUrl,
  failUrl,
  terminal: terminalOverride,
  password: passwordOverride,
}: {
  amount: number
  description: string
  paymentId: string
  successUrl: string
  failUrl: string
  terminal?: string
  password?: string
}) {
  const terminalId = terminalOverride || process.env.TRANZILA_TERMINAL_ID || ''
  const terminalPassword = passwordOverride || process.env.TRANZILA_TERMINAL_PASSWORD || ''

  if (!terminalId) {
    throw new Error('Tranzila terminal not configured')
  }

  const params = new URLSearchParams({
    TranzilaPW: terminalPassword,
    sum: amount.toFixed(2),
    currency: '1',
    pdesc: description,
    tranmode: 'A',
    success_url_address: successUrl,
    fail_url_address: failUrl,
    cField1: paymentId,
    lang: 'il',
  })

  const url = `https://directng.tranzila.com/${terminalId}/iframenew.php?${params.toString()}`
  return { url, transactionId: null }
}
