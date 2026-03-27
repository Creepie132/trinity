'use client'

import { useModalStore } from '@/store/useModalStore'
import { UnifiedSalesDialog } from '@/components/sales/UnifiedSalesDialog'
import type { UnifiedSaleModalData } from '@/components/sales/UnifiedSalesDialog'

/**
 * UnifiedSalesModal — обёртка ModalStore над UnifiedSalesDialog.
 * Регистрируется один раз в ModalManager.
 *
 * Вызов из любой точки:
 *   openModal('sale-unified', {
 *     clientId?: string,      // предзаполнить клиента
 *     clientName?: string,
 *     preloadedItems?: [...],  // из визита
 *     visitId?: string,        // визит → завершить после оплаты
 *     onSuccess?: () => void,
 *   })
 */
export function UnifiedSalesModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()

  const isOpen  = isModalOpen('sale-unified')
  const rawData = getModalData('sale-unified')

  return (
    <UnifiedSalesDialog
      open={isOpen}
      onOpenChange={open => { if (!open) closeModal('sale-unified') }}
      initialData={rawData as UnifiedSaleModalData | undefined}
    />
  )
}
