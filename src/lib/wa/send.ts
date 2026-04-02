/**
 * sendWhatsAppMessage — Trinity CRM
 *
 * Центральная утилита отправки сообщений через Whapi с Fallback-паттерном.
 *
 * Логика приоритетов:
 *   1. Per-tenant custom Whapi (use_custom_wa=true + заполнены поля) → custom инстанс
 *   2. Global Whapi из wa_integrations текущей org                    → org-level
 *   3. ENV fallback (WHAPI_TOKEN + WHAPI_BASE_URL)                    → системный
 *
 * ВАЖНО: Всегда вызывать с service role Supabase — функция читает Vault.
 *
 * @version 1.0.0
 */

import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { normalizePhone } from '@/lib/wa/phone'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendWAResult {
  ok:        boolean
  messageId: string | null
  provider:  'custom' | 'org' | 'global_env' | 'none'
  error?:    string
}

export interface SendWAOptions {
  orgId:   string
  to:      string   // телефон в любом формате — будет нормализован
  message: string
  /** Если true — не бросает исключение при ошибке отправки, возвращает ok:false */
  softFail?: boolean
}

// ─── Конфигурация ─────────────────────────────────────────────────────────────

const DEFAULT_WHAPI_BASE = 'https://gate.whapi.cloud'

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Отправляет WhatsApp-сообщение через Whapi.
 * Автоматически выбирает правильный инстанс: custom → org → env.
 */
export async function sendWhatsAppMessage(opts: SendWAOptions): Promise<SendWAResult> {
  const { orgId, to, message, softFail = false } = opts

  // Нормализуем телефон в международный формат
  const phone = normalizePhone(to)
  if (!phone) {
    return { ok: false, messageId: null, provider: 'none', error: 'Invalid phone number' }
  }

  const supabase = createSupabaseServiceClient()

  // ── Шаг 1: Проверяем per-tenant custom конфиг ────────────────────────────
  try {
    const { data: customRows } = await supabase
      .rpc('get_custom_wa_config', { p_org_id: orgId })

    if (customRows && customRows.length > 0) {
      const { api_url, api_key } = customRows[0]
      const result = await _sendViaWhapi({
        apiKey:   api_key,
        baseUrl:  api_url || DEFAULT_WHAPI_BASE,
        phone,
        message,
      })
      return { ...result, provider: 'custom' }
    }
  } catch (err) {
    console.error('[sendWA] custom config lookup error:', err)
    // Продолжаем к следующему уровню
  }

  // ── Шаг 2: Org-level Whapi из wa_integrations ─────────────────────────────
  try {
    const { data: apiKey } = await supabase
      .rpc('get_wa_api_key', { p_org_id: orgId })

    if (apiKey) {
      // Читаем instance_id для корректного base URL
      const { data: integration } = await supabase
        .from('wa_integrations')
        .select('instance_id')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .maybeSingle()

      const baseUrl = integration?.instance_id
        ? `${DEFAULT_WHAPI_BASE}/${integration.instance_id}`
        : DEFAULT_WHAPI_BASE

      const result = await _sendViaWhapi({ apiKey, baseUrl, phone, message })
      return { ...result, provider: 'org' }
    }
  } catch (err) {
    console.error('[sendWA] org-level key lookup error:', err)
  }

  // ── Шаг 3: ENV Fallback (глобальный системный инстанс) ───────────────────
  const envToken = process.env.WHAPI_TOKEN
  const envBase  = process.env.WHAPI_BASE_URL || DEFAULT_WHAPI_BASE

  if (envToken) {
    const result = await _sendViaWhapi({ apiKey: envToken, baseUrl: envBase, phone, message })
    return { ...result, provider: 'global_env' }
  }

  // Ни один провайдер не доступен
  const noProviderResult: SendWAResult = {
    ok:       false,
    messageId: null,
    provider: 'none',
    error:    'No WhatsApp provider configured',
  }

  if (!softFail) {
    throw new Error(noProviderResult.error)
  }
  return noProviderResult
}

// ─── Internal HTTP call ───────────────────────────────────────────────────────

interface WhapiCallOpts {
  apiKey:  string
  baseUrl: string
  phone:   string
  message: string
}

async function _sendViaWhapi(opts: WhapiCallOpts): Promise<Omit<SendWAResult, 'provider'>> {
  const { apiKey, baseUrl, phone, message } = opts
  const base = baseUrl.replace(/\/$/, '')

  try {
    const res = await fetch(`${base}/messages/text`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to:   `${phone}@s.whatsapp.net`,
        body: message,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => String(res.status))
      console.error(`[sendWA] Whapi HTTP ${res.status}:`, errText)
      return { ok: false, messageId: null, error: `Whapi ${res.status}: ${errText}` }
    }

    const data = await res.json()
    return { ok: true, messageId: data?.message?.id ?? null }
  } catch (err: any) {
    console.error('[sendWA] fetch error:', err)
    return { ok: false, messageId: null, error: err.message }
  }
}
