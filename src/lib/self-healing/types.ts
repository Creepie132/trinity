/**
 * lib/self-healing/types.ts
 * Типы и константы для Zero-Touch Resolution системы Trinity CRM.
 * Dead Man's Switch — stateless, event-driven (без setTimeout).
 */

export type HealingStatus =
  | 'analyzing'          // Claude анализирует ошибку
  | 'fix_generated'      // Фикс сгенерирован, ветка создана
  | 'testing'            // CI запущен, тесты идут
  | 'merged'             // Авто-мерж в main выполнен + merged_at проставлен
  | 'deployed'           // Продакшн стабилен (15 мин прошли без новых ошибок)
  | 'rolled_back'        // Dead Man's Switch сработал — откат выполнен
  | 'failed'             // Пайплайн упал (лимит попыток / ошибка CI)
  | 'awaiting_approval'  // Критический путь → ждёт ручного апрува

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

// ─── DB row types ──────────────────────────────────────────────────────────────

export interface SystemError {
  id: string
  org_id: string | null
  user_id: string | null
  route: string
  method: string
  error_message: string
  error_stack: string | null
  request_body: Record<string, unknown> | null
  severity: ErrorSeverity
  attempt_count: number
  is_critical_path: boolean
  healed: boolean
  created_at: string
  updated_at: string
}

export interface AiHealingLog {
  id: string
  error_id: string
  status: HealingStatus
  branch_name: string | null
  pr_url: string | null
  preview_url: string | null
  /** Vercel deployment ID после мержа — нужен для Dead Man's Switch rollback */
  deployment_id: string | null
  /** Предыдущий стабильный Vercel deployment ID — цель для rollback */
  previous_deployment_id: string | null
  claude_analysis: string | null
  generated_diff: string | null
  test_file_content: string | null
  test_result: 'pass' | 'fail' | null
  build_result: 'success' | 'failure' | null
  rollback_triggered: boolean
  rollback_at: string | null
  /** Timestamp мержа в main — ключевое поле для Dead Man's Switch */
  merged_at: string | null
  created_at: string
  updated_at: string
}

// ─── Dead Man's Switch результат ──────────────────────────────────────────────

export interface DeadManCheckResult {
  /** true = деградация после последнего деплоя — нужен rollback */
  shouldRollback: boolean
  /** Лог который нужно откатить (содержит previous_deployment_id) */
  healingLog: AiHealingLog | null
}

// ─── Константы ────────────────────────────────────────────────────────────────

/**
 * Роуты, требующие ручного апрува (Assisted Healing без авто-мержа).
 * Совпадение проверяется через startsWith — покрывает все sub-пути.
 */
export const CRITICAL_PATHS: readonly string[] = [
  '/api/payments',
  '/api/auth',
  '/api/billing',
  '/api/tranzila',
  '/api/webhooks',
  '/api/plan-change',
  '/api/gateway',
] as const

/** Максимум попыток авто-исправления на одну ошибку (анти-цикл) */
export const MAX_HEALING_ATTEMPTS = 2

/**
 * Окно мониторинга Dead Man's Switch.
 * Если новая ошибка в том же роуте появляется в течение этого времени
 * после merged_at — считаем деградацией и откатываемся.
 */
export const DEAD_MAN_SWITCH_WINDOW_MS = 15 * 60 * 1000 // 15 минут

/** Проверить — является ли роут критическим путём */
export function isCriticalPath(route: string): boolean {
  return CRITICAL_PATHS.some(p => route.startsWith(p))
}
