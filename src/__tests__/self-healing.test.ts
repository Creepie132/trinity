/**
 * src/__tests__/self-healing.test.ts
 * Базовые тесты модуля self-healing (без реальных внешних вызовов)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CRITICAL_PATHS, MAX_HEALING_ATTEMPTS, DEAD_MAN_SWITCH_WINDOW_MS } from '@/lib/self-healing/types'

// Моки на top-level (Vitest hoisting требует этого)
vi.mock('@/lib/self-healing/db', () => ({
  upsertSystemError: vi.fn().mockResolvedValue({
    id: 'test-error-id',
    route: '/api/test',
    error_message: 'Test error',
    attempt_count: 0,
    is_critical_path: false,
    healed: false,
  }),
}))
vi.mock('@/lib/self-healing/pipeline', () => ({
  runHealingPipeline: vi.fn().mockResolvedValue(undefined),
}))

// ─── Types & constants ────────────────────────────────────────────────────────

describe('self-healing constants', () => {
  it('MAX_HEALING_ATTEMPTS равен 2', () => {
    expect(MAX_HEALING_ATTEMPTS).toBe(2)
  })

  it('DEAD_MAN_SWITCH_WINDOW_MS равен 15 минутам', () => {
    expect(DEAD_MAN_SWITCH_WINDOW_MS).toBe(15 * 60 * 1000)
  })

  it('CRITICAL_PATHS содержит обязательные роуты', () => {
    expect(CRITICAL_PATHS).toContain('/api/payments')
    expect(CRITICAL_PATHS).toContain('/api/auth')
    expect(CRITICAL_PATHS).toContain('/api/billing')
  })
})

// ─── Blast Radius Isolation ───────────────────────────────────────────────────

describe('Blast Radius Isolation', () => {
  it('определяет критический путь для /api/payments', () => {
    expect(CRITICAL_PATHS.some(p => '/api/payments/create'.startsWith(p))).toBe(true)
  })

  it('определяет некритический путь для /api/clients', () => {
    expect(CRITICAL_PATHS.some(p => '/api/clients'.startsWith(p))).toBe(false)
  })

  it('определяет некритический путь для /api/visits', () => {
    expect(CRITICAL_PATHS.some(p => '/api/visits'.startsWith(p))).toBe(false)
  })

  it('/api/auth является критическим', () => {
    expect(CRITICAL_PATHS.some(p => '/api/auth/callback'.startsWith(p))).toBe(true)
  })
})

// ─── withErrorCapture behaviour ──────────────────────────────────────────────

describe('withErrorCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('перехватывает ошибку и возвращает 500 с errorId', async () => {
    const { withErrorCapture } = await import('@/lib/self-healing/error-capture')
    const { NextRequest } = await import('next/server')

    const brokenHandler = vi.fn().mockRejectedValue(new Error('Simulated crash'))
    const wrapped = withErrorCapture(brokenHandler, '/api/test')

    const req = new NextRequest('http://localhost/api/test')
    const res = await wrapped(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Internal server error')
    expect(body.errorId).toBe('test-error-id')
  })

  it('пропускает NEXT_NOT_FOUND как re-throw', async () => {
    const { withErrorCapture } = await import('@/lib/self-healing/error-capture')
    const { NextRequest } = await import('next/server')

    const notFoundHandler = vi.fn().mockRejectedValue(new Error('NEXT_NOT_FOUND'))
    const wrapped = withErrorCapture(notFoundHandler, '/api/test')

    const req = new NextRequest('http://localhost/api/test')
    await expect(wrapped(req)).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
