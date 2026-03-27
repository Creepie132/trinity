'use client'

/**
 * EditProductModal — тонкая обёртка для useModalStore.
 * Внутри использует UnifiedProductDialog (mode='edit').
 * Файл EditProductDialog.tsx удалён — этот файл является его заменой.
 */

import { useModalStore } from '@/store/useModalStore'
import { UnifiedProductDialog } from '@/components/inventory/UnifiedProductDialog'

export function EditProductModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()

  const isOpen = isModalOpen('product-edit')
  const data   = getModalData('product-edit')
  const product = data?.product ?? null

  // Также обслуживаем product-unified с mode='edit' (новый вызов из ProductDetailsModal)
  const isOpenUnified = isModalOpen('product-unified') && getModalData('product-unified')?.mode === 'edit'
  const productUnified = getModalData('product-unified')?.product ?? null

  if (isOpen) {
    return (
      <UnifiedProductDialog
        open={isOpen}
        onClose={() => closeModal('product-edit')}
        mode="edit"
        product={product}
      />
    )
  }

  if (isOpenUnified) {
    return (
      <UnifiedProductDialog
        open={isOpenUnified}
        onClose={() => closeModal('product-unified')}
        mode="edit"
        product={productUnified}
      />
    )
  }

  return null
}
