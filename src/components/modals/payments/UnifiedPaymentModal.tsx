'use client'

import { useModalStore } from '@/store/useModalStore'
import { UnifiedPaymentDialog } from '@/components/payments/UnifiedPaymentDialog'
import type { UnifiedPaymentModalData } from '@/components/payments/UnifiedPaymentDialog'

/**
 * UnifiedPaymentModal — тонкая обёртка ModalStore над UnifiedPaymentDialog.
 * Регистрируется один раз в ModalManager.
 *
 * Вызов из любой точки:
 *   openModal('payment-unified', {
 *     defaultMethod: 'cash',   // пропустить MethodStep
 *     clientId: '...',         // предзаполнить клиента
 *     clientName: 'Иван Иванов',
 *     visitId: '...',          // привязать к визиту
 *     onSuccess: () => refetch(),
 *   })
 */
export function UnifiedPaymentModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()

  const isOpen = isModalOpen('payment-unified')
  const rawData = getModalData('payment-unified')

  return (
    <UnifiedPaymentDialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) closeModal('payment-unified') }}
      initialData={rawData as UnifiedPaymentModalData | undefined}
    />
  )
}
