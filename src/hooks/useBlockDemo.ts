'use client'

/**
 * useBlockDemo — хук для блокировки действий в demo-режиме.
 *
 * Использование:
 *   const blockDemo = useBlockDemo()
 *
 *   const handleDeleteEmployee = () => {
 *     if (blockDemo('delete-employee')) return  // ← показывает toast и выходит
 *     // ... реальная логика удаления
 *   }
 *
 * Безопасен вне DemoProvider — всегда возвращает false в prod.
 */

import { useDemoContextSafe, BlockedAction } from '@/contexts/DemoContext'

export function useBlockDemo() {
  const demo = useDemoContextSafe()

  // В prod (вне DemoProvider) — никогда не блокируем
  if (!demo) return (_action: BlockedAction) => false

  return demo.checkBlocked
}
