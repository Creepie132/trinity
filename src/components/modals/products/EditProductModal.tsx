'use client'

import { useModalStore } from '@/store/useModalStore'
import { EditProductDialog } from '@/components/inventory/EditProductDialog'

export function EditProductModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('product-edit')
  const data = getModalData('product-edit')
  
  const product = data?.product || null

  return (
    <EditProductDialog
      open={isOpen}
      onClose={() => closeModal('product-edit')}
      product={product}
    />
  )
}
