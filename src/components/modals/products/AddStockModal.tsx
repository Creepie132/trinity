'use client'

import { useModalStore } from '@/store/useModalStore'
import { AddStockDialog } from '@/components/inventory/AddStockDialog'

export function AddStockModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('product-add-stock')
  const data = getModalData('product-add-stock')
  
  const product = data?.product || null

  return (
    <AddStockDialog
      open={isOpen}
      onClose={() => closeModal('product-add-stock')}
      product={product}
    />
  )
}
