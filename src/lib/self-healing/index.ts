/**
 * lib/self-healing/index.ts
 * Публичный API модуля self-healing.
 * Импортируйте отсюда, не из внутренних файлов напрямую.
 */
export { withErrorCapture } from './error-capture'
export { runHealingPipeline } from './pipeline'
export type { SystemError, AiHealingLog, HealingStatus, ErrorSeverity } from './types'
export { CRITICAL_PATHS, MAX_HEALING_ATTEMPTS, DEAD_MAN_SWITCH_WINDOW_MS } from './types'
