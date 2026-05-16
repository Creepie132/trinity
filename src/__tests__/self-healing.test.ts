/**
 * src/__tests__/self-healing.test.ts
 */
import { describe, it, expect, vi } from 'vitest'
import {
  CRITICAL_PATHS, MAX_HEALING_ATTEMPTS,
  DEAD_MAN_SWITCH_WINDOW_MS, isCriticalPath,
} from '@/lib/self-healing/types'

vi.mock('@/lib/self-healing/db', () => ({
  upsertSystemError: vi.fn().mockResolvedValue({
    id: 'test-error-id',
    route: '/api/test',
    error_message: 'Test error',
    attempt_count: 0,
    is_critical_path: false,
    healed: false,
  }),
  checkDeadManSwitch: vi.fn().mockResolvedValue({
    shouldRollback: false,
    healingLog: null,
  }),
  updateHealingLog: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/self-healing/pipeline', () => ({
  runHealingPipeline: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/self-healing/vercel', () => ({
  rollbackToDeployment: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/self-healing/telegram-alerts', () => ({
  alertRollbackTriggered: vi.fn().mockResolvedValue(undefined),
  alertMaxAttemptsReached: vi.fn().mockResolvedValue(undefined),
}))

// ─── Constants ────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('MAX_HEALING_ATTEMPTS = 2', () => expect(MAX_HEALING_ATTEMPTS).toBe(2))
  it('DEAD_MAN_SWITCH = 15 мин', () => expect(DEAD_MAN_SWITCH_WINDOW_MS).toBe(15 * 60 * 1000))
  it('CRITICAL_PATHS содержит payments/auth/billing', () => {
    expect(CRITICAL_PATHS).toContain('/api/payments')
    expect(CRITICAL_PATHS).toContain('/api/auth')
    expect(CRITICAL_PATHS).toContain('/api/billing')
  })
})

// ─── Blast Radius ─────────────────────────────────────────────────────────────

describe('isCriticalPath()', () => {
  it('/api/payments/create → критический', () => expect(isCriticalPath('/api/payments/create')).toBe(true))
  it('/api/auth/callback → критический',   () => expect(isCriticalPath('/api/auth/callback')).toBe(true))
  it('/api/clients → НЕ критический',      () => expect(isCriticalPath('/api/clients')).toBe(false))
  it('/api/visits → НЕ критический',       () => expect(isCriticalPath('/api/visits')).toBe(false))
})

// ─── withErrorCapture ─────────────────────────────────────────────────────────

describe('withErrorCapture', () => {
  it('возвращает 500 с errorId при ошибке', async () => {
    const { withErrorCapture } = await import('@/lib/self-healing/error-capture')
    const { NextRequest } = await import('next/server')

    const wrapped = withErrorCapture(
      vi.fn().mockRejectedValue(new Error('Simulated crash')),
      '/api/test'
    )
    const res = await wrapped(new NextRequest('http://localhost/api/test'))

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Internal server error')
    expect(body.errorId).toBe('test-error-id')
  })

  it('пробрасывает NEXT_NOT_FOUND без перехвата', async () => {
    const { withErrorCapture } = await import('@/lib/self-healing/error-capture')
    const { NextRequest } = await import('next/server')

    const wrapped = withErrorCapture(
      vi.fn().mockRejectedValue(new Error('NEXT_NOT_FOUND')),
      '/api/test'
    )
    await expect(wrapped(new NextRequest('http://localhost/api/test')))
      .rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('Dead Mans Switch: rollback при shouldRollback=true', async () => {
    const db = await import('@/lib/self-healing/db')
    const vercel = await import('@/lib/self-healing/vercel')

    vi.mocked(db.checkDeadManSwitch).mockResolvedValueOnce({
      shouldRollback: true,
      healingLog: {
        id: 'log-id',
        error_id: 'err-id',
        status: 'merged',
        previous_deployment_id: 'dpl_prev_123',
        deployment_id: 'dpl_new_456',
        merged_at: new Date().toISOString(),
      } as any,
    })

    const { withErrorCapture } = await import('@/lib/self-healing/error-capture')
    const { NextRequest } = await import('next/server')

    const wrapped = withErrorCapture(
      vi.fn().mockRejectedValue(new Error('Crash after deploy')),
      '/api/clients'
    )
    const res = await wrapped(new NextRequest('http://localhost/api/clients'))

    expect(res.status).toBe(500)
    expect(vercel.rollbackToDeployment).toHaveBeenCalledWith('dpl_prev_123')
    const body = await res.json()
    expect(body.message).toContain('rollback')
  })
})
