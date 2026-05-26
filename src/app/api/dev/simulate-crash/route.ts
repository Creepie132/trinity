/**
 * app/api/dev/simulate-crash/route.ts
 * Симулятор краш-тестов для проверки Self-Healing пайплайна.
 * ВНИМАНИЕ: только в development ENV с валидным секретом.
 */
import { NextRequest, NextResponse } from 'next/server'
import { withErrorCapture } from '@/lib/self-healing/error-capture'

type CrashType = 'db_error' | 'syntax' | 'timeout' | 'auth' | 'payment'

function generateError(type: CrashType): never {
  switch (type) {
    case 'db_error':
      throw Object.assign(
        new Error('Database connection failed: ECONNREFUSED 127.0.0.1:5432'),
        { code: 'ECONNREFUSED' }
      )
    case 'syntax':
      // Синтаксическая/runtime ошибка — намеренный TypeError
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(null as any).nonExistentMethod()
      throw new Error('unreachable')
    case 'timeout':
      throw new Error('Request timeout: Supabase query exceeded 30000ms')
    case 'auth':
      throw new Error('Payment gateway authentication failed: invalid terminal token')
    case 'payment':
      throw new Error('Tranzila payment transaction failed: card declined (code 051)')
    default:
      throw new Error(`Unknown crash type: ${type}`)
  }
}

async function handler(req: NextRequest): Promise<NextResponse> {
  // ── Защита: только dev ENV секрет ────────────────────────────────────────
  const isDev = process.env.NODE_ENV === 'development'
  const secret = req.headers.get('x-crash-secret')
  const validSecret = secret === process.env.SIMULATE_CRASH_SECRET

  if (!isDev && !validSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Читаем тип краша из query ─────────────────────────────────────────────
  const url = new URL(req.url)
  const type = (url.searchParams.get('type') ?? 'db_error') as CrashType
  const validTypes: CrashType[] = ['db_error', 'syntax', 'timeout', 'auth', 'payment']

  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Use: ${validTypes.join(', ')}` },
      { status: 400 }
    )
  }

  // ── Искусственно роняем ───────────────────────────────────────────────────
  console.log(`[simulate-crash] Triggering ${type} crash...`)

  try {
    generateError(type)
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error(`[simulate-crash] Caught simulated ${type} error:`, error.message)
    return NextResponse.json(
      {
        simulated: true,
        type,
        error: error.message,
        name: error.name,
        // Include any extra properties (e.g. code for db_error)
        ...(err instanceof Object ? { ...err as Record<string, unknown> } : {}),
      },
      { status: 500 }
    )
  }

  // Should never reach here since generateError always throws
  return NextResponse.json({ error: 'Simulation failed to trigger error' }, { status: 500 })
}

// Оборачиваем в withErrorCapture — именно так тестируем весь цикл
export const GET = withErrorCapture(handler, '/api/dev/simulate-crash')