'use client'

import { useModalStore } from '@/store/useModalStore'
import { AddProductDialog } from '@/components/visits/AddProductDialog'

export function AddProductModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('visit-add-product')
  const data = getModalData('visit-add-product')

  return (
    <AddProductDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('visit-add-product')}
      visitId={data?.visitId}
      onSuccess={data?.onSuccess}
    />
  )
}
