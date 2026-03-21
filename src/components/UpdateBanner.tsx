'use client'

import { useServiceWorker } from '@/hooks/useServiceWorker'

/**
 * Невидимый компонент — просто активирует автообновление SW.
 * Баннер удалён: обновление происходит автоматически при уходе пользователя.
 */
export function UpdateBanner() {
  useServiceWorker()
  return null
}
