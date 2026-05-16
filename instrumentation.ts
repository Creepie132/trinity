/**
 * instrumentation.ts  (Next.js 14+ — корень проекта)
 * Глобальный перехват необработанных ошибок Node.js runtime.
 *
 * Покрывает случаи которые НЕ доходят до withErrorCapture:
 * - unhandledRejection (Promise без .catch())
 * - uncaughtException  (синхронные throw вне try/catch)
 * - Ошибки в middleware.ts
 * - Ошибки в серверных компонентах (Server Components)
 *
 * Этот файл автоматически импортируется Next.js при старте.
 * Не нужно ни одного import в других файлах.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Только серверная сторона — не трогаем браузер
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // Ленивый импорт — модуль загружается один раз при старте
  const { captureGlobalError } = await import('@/lib/self-healing/global-capture')

  // ── unhandledRejection ─────────────────────────────────────────────────────
  // Promise.reject() без .catch() — самая частая причина "тихих" крашей
  process.on('unhandledRejection', (reason: unknown) => {
    const err = reason instanceof Error
      ? reason
      : new Error(String(reason))

    console.error('[instrumentation] unhandledRejection:', err.message)
    captureGlobalError(err, 'unhandledRejection').catch(() => {})
  })

  // ── uncaughtException ──────────────────────────────────────────────────────
  // Синхронный throw вне try/catch — обычно фатально, но мы успеваем записать
  process.on('uncaughtException', (err: Error) => {
    console.error('[instrumentation] uncaughtException:', err.message)
    captureGlobalError(err, 'uncaughtException').catch(() => {})
    // НЕ вызываем process.exit() — Next.js сам управляет процессом
  })

  console.log('[instrumentation] Global error handlers registered')
}
