/**
 * apiFetch — типизированный fetch-wrapper для всех API-запросов Trinity.
 *
 * Гарантии:
 *  - При !res.ok бросает структурированный ApiError (не просто строку)
 *  - При 403 + code=LIMIT_EXCEEDED бросает LimitExceededError
 *    который перехватывается DemoLimitGuard через MutationCache.subscribe()
 *  - Все остальные ошибки — ApiError с полем message
 *
 * Использование:
 *   import { apiFetch } from '@/lib/api-fetch'
 *
 *   // Простой POST (заменяет fetch + res.json + if(!res.ok) throw)
 *   const visit = await apiFetch('/api/visits', { method: 'POST', json: body })
 *
 *   // GET
 *   const clients = await apiFetch('/api/clients')
 */

// ─── Error types ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class LimitExceededError extends ApiError {
  code = 'LIMIT_EXCEEDED' as const
  constructor(
    public entity: string,
    public current: number,
    public limit: number,
  ) {
    super(`Demo limit reached: ${current}/${limit} ${entity}`, 403)
    this.name = 'LimitExceededError'
  }
}

// ─── Options ──────────────────────────────────────────────────────────────────

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** Automatically serializes to JSON and sets Content-Type header */
  json?: unknown
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * apiFetch<T>(url, options?) → Promise<T>
 *
 * Drop-in replacement for fetch() that:
 *  1. Serializes `json` option → body + Content-Type header
 *  2. Throws LimitExceededError on 403 LIMIT_EXCEEDED (caught by DemoLimitGuard)
 *  3. Throws ApiError on all other non-ok responses
 *  4. Returns parsed JSON body on success
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { json, ...rest } = options

  const fetchOptions: RequestInit = { ...rest }

  if (json !== undefined) {
    fetchOptions.body = JSON.stringify(json)
    fetchOptions.headers = {
      'Content-Type': 'application/json',
      ...(rest.headers ?? {}),
    }
  }

  const res = await fetch(url, fetchOptions)

  // Parse body regardless of status — needed for error payload
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    // Non-JSON response (e.g. 500 text/html) — body stays null
  }

  if (!res.ok) {
    const payload = body as Record<string, unknown> | null

    // ★ 403 LIMIT_EXCEEDED → special error for DemoLimitGuard interceptor
    if (res.status === 403 && payload?.code === 'LIMIT_EXCEEDED') {
      throw new LimitExceededError(
        String(payload.entity ?? 'unknown'),
        Number(payload.current ?? 0),
        Number(payload.limit ?? 0),
      )
    }

    // All other errors
    const message = typeof payload?.error === 'string'
      ? payload.error
      : typeof payload?.message === 'string'
        ? payload.message
        : `HTTP ${res.status}`

    throw new ApiError(message, res.status, body)
  }

  return body as T
}
