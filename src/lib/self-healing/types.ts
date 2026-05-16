/**
 * self-healing/types.ts
 * Типы для системы авто-исправления Trinity CRM (Zero-Touch Resolution)
 */

export type HealingStatus =
  | 'analyzing'          // Claude анализирует ошибку
  | 'fix_generated'      // Фикс сгенерирован, ветка создана
  | 'testing'            // CI запущен, тесты идут
  | 'merged'             // Авто-мерж в main выполнен
  | 'deployed'           // Продакшн задеплоен
  | 'rolled_back'        // Dead Man's Switch сработал — откат
  | 'failed'             // Пайплайн упал (лимит попыток / ошибка CI)
  | 'awaiting_approval'  // Критический путь → ждёт ручного апрува

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SystemError {
  id: string
  org_id: string | null
  route: string
  method: string
  error_message: string
  error_stack: string | null
  request_body: Record<string, unknown> | null
  user_id: string | null
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
  deployment_id: string | null
  previous_deployment_id: string | null
  claude_analysis: string | null
  generated_diff: string | null
  test_file_content: string | null
  test_result: 'pass' | 'fail' | null
  build_result: 'success' | 'failure' | null
  rollback_triggered: boolean
  rollback_at: string | null
  created_at: string
  updated_at: string
}

/** Роуты, требующие ручного апрува (Assisted Healing) */
export const CRITICAL_PATHS: readonly string[] = [
  '/api/payments',
  '/api/auth',
  '/api/billing',
  '/api/tranzila',
  '/api/webhooks',
  '/api/plan-change',
  '/api/gateway',
] as const

/** Максимум попыток авто-исправления на одну ошибку */
export const MAX_HEALING_ATTEMPTS = 2

/** Dead Man's Switch: окно мониторинга после деплоя (мс) */
export const DEAD_MAN_SWITCH_WINDOW_MS = 15 * 60 * 1000
