'use client'

import { useModalStore } from '@/store/useModalStore'
import { UnifiedVisitDialog } from '@/components/visits/UnifiedVisitDialog'
import type { UnifiedVisitModalData } from '@/components/visits/UnifiedVisitDialog'

/**
 * UnifiedVisitModal — обёртка ModalStore над UnifiedVisitDialog.
 * Регистрируется один раз в ModalManager.
 *
 * Создание визита:
 *   openModal('visit-unified', { mode: 'create', clientId?, date?, time? })
 *
 * Редактирование:
 *   openModal('visit-unified', { mode: 'edit', visit: Visit })
 */
export function UnifiedVisitModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()

  const isOpen  = isModalOpen('visit-unified')
  const rawData = getModalData('visit-unified')

  return (
    <UnifiedVisitDialog
      open={isOpen}
      onOpenChange={open => { if (!open) closeModal('visit-unified') }}
      initialData={rawData as UnifiedVisitModalData | undefined}
    />
  )
}
