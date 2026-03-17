import crypto from 'crypto'

/**
 * Tranzila Webhook Security — верификация входящих уведомлений.
 *
 * Алгоритм верификации (Tranzila DirectNG / iFrame):
 *   TranzilaToken = MD5( terminal_password + sum + currency_code )
 *
 * Документация: Tranzila DirectNG Integration Guide, раздел "notify_url_address".
 *
 * Мы пробуем все сконфигурированные пароли терминалов — это позволяет
 * обрабатывать уведомления с основного терминала и token-терминала одним кодом.
 */

// ─── Типы ────────────────────────────────────────────────────────────────────

export type TranzilaWebhookParams = Record<string, string | null | undefined>

export interface TranzilaVerificationResult {
  valid: boolean
  reason: 'ok' | 'missing_token' | 'no_passwords' | 'signature_mismatch' | 'skipped_dev'
}

// ─── Основная верификация ─────────────────────────────────────────────────────

/**
 * Верифицирует подпись Tranzila webhook.
 *
 * @param params   Распарсенные параметры из тела webhook POST.
 * @returns        { valid, reason } — результат верификации с причиной.
 *
 * Переменные окружения, которые используются:
 *   TRANZILA_TERMINAL_PASSWORD  — основной терминал (ambersolt)
 *   TRANZILA_TOKEN_PASSWORD     — token-терминал (ambersolttok)
 *   TRANZILLA_TERMINAL_PASSWORD — опечатка-вариант (legacy)
 *   TRANZILA_SKIP_SIG_CHECK     — 'true' только для локальной разработки
 */
export function verifyTranzilaSignature(
  params: TranzilaWebhookParams,
): TranzilaVerificationResult {
  // ── Dev-bypass (ТОЛЬКО для localhost, никогда в production) ──────────────
  if (process.env.TRANZILA_SKIP_SIG_CHECK === 'true' && process.env.NODE_ENV !== 'production') {
    console.warn('[Tranzila] ⚠️  Signature check SKIPPED — dev mode only!')
    return { valid: true, reason: 'skipped_dev' }
  }

  // ── Получаем TranzilaToken из параметров ─────────────────────────────────
  const token = (params['TranzilaToken'] ?? '').toLowerCase().trim()
  if (!token) {
    console.error('[Tranzila Security] ❌ TranzilaToken missing in webhook payload')
    return { valid: false, reason: 'missing_token' }
  }

  // ── Параметры для расчёта хэша ───────────────────────────────────────────
  // Tranzila возвращает те же поля, что мы отправили в iFrame-URL.
  // sum → передаём как 'sum', currency → как '1' (ILS).
  // Пробуем оба варианта имени поля валюты (currency_code / currency).
  const sum = params['sum'] ?? params['TrTotal'] ?? ''
  const currency = params['currency_code'] ?? params['currency'] ?? '1'

  // ── Собираем пароли для проверки ─────────────────────────────────────────
  const passwords = [
    process.env.TRANZILA_TERMINAL_PASSWORD,
    process.env.TRANZILA_TOKEN_PASSWORD,
    process.env.TRANZILLA_TERMINAL_PASSWORD,  // typo-вариант в .env.local
  ].filter((p): p is string => !!p && p.length > 0)

  if (passwords.length === 0) {
    console.error('[Tranzila Security] ❌ No terminal passwords configured! Set TRANZILA_TERMINAL_PASSWORD.')
    return { valid: false, reason: 'no_passwords' }
  }

  // ── Проверяем каждый пароль ───────────────────────────────────────────────
  // MD5( password + sum + currency_code )
  for (const password of passwords) {
    const expected = crypto
      .createHash('md5')
      .update(password + sum + currency)
      .digest('hex')

    // Constant-time сравнение — защита от timing attack
    // MD5 всегда даёт ровно 32 hex-символа = 16 байт, длины совпадают всегда
    const tokenBuf    = Buffer.from(token,    'hex')
    const expectedBuf = Buffer.from(expected, 'hex')
    if (tokenBuf.length === expectedBuf.length && crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
      return { valid: true, reason: 'ok' }
    }
  }

  console.error('[Tranzila Security] ❌ Signature mismatch', {
    token_received: token,
    sum,
    currency,
    passwords_tried: passwords.length,
  })
  return { valid: false, reason: 'signature_mismatch' }
}

// ─── Валидация терминала ──────────────────────────────────────────────────────

/**
 * Проверяет, что webhook пришёл с одного из наших терминалов.
 * Если Tranzila не прислала terminal_name — пропускаем (нельзя проверить).
 */
export function validateTranzilaTerminal(params: TranzilaWebhookParams): boolean {
  const incoming = params['terminal_name'] ?? params['terminal']
  if (!incoming) {
    // Tranzila не всегда присылает terminal_name — разрешаем
    return true
  }

  const allowed = [
    process.env.TRANZILA_TERMINAL_ID,
    process.env.TRANZILLA_TERMINAL_ID,      // typo-вариант
    process.env.TRANZILA_TOKEN_TERMINAL,
    process.env.NEXT_PUBLIC_TRANZILA_TOKEN_TERMINAL,
  ].filter((t): t is string => !!t && t.length > 0)

  if (allowed.length === 0) return true  // не сконфигурировано — разрешаем

  const ok = allowed.includes(incoming)
  if (!ok) {
    console.error('[Tranzila Security] ❌ Unknown terminal in webhook:', incoming, '| allowed:', allowed)
  }
  return ok
}

// ─── Извлечение org_id ────────────────────────────────────────────────────────

/**
 * Извлекает org_id из параметров webhook.
 *
 * Tranzila возвращает cField1 (то, что мы передали при создании ссылки).
 * Некоторые старые flows использовали 'custom' — поддерживаем оба варианта.
 */
export function extractOrgIdFromWebhook(params: TranzilaWebhookParams): string | null {
  return params['cField1'] ?? params['custom'] ?? null
}

// ─── Извлечение полных данных транзакции ─────────────────────────────────────

export interface TranzilaWebhookData {
  orgId: string | null
  responseCode: string | null
  cardToken: string | null
  cardNum: string | null
  expDate: string | null
  transactionId: string | null
  sum: string | null
  currency: string | null
  terminalName: string | null
}

/**
 * Удобная функция: парсит все нужные поля из параметров webhook.
 */
export function extractWebhookData(params: TranzilaWebhookParams): TranzilaWebhookData {
  return {
    orgId:         extractOrgIdFromWebhook(params),
    responseCode:  params['Response'] ?? null,
    cardToken:     params['TranzilaTK'] ?? null,
    cardNum:       params['cardnum'] ?? null,
    expDate:       params['expdate'] ?? null,
    transactionId: params['index'] ?? params['ConfirmationCode'] ?? null,
    sum:           params['sum'] ?? params['TrTotal'] ?? null,
    currency:      params['currency_code'] ?? params['currency'] ?? '1',
    terminalName:  params['terminal_name'] ?? params['terminal'] ?? null,
  }
}
