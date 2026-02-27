'use client'

import { useModalStore } from '@/store/useModalStore'
import { SellProductDialog } from '@/components/inventory/SellProductDialog'

export function SellProductModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('product-sell')
  const data = getModalData('product-sell')
  
  const product = data?.product || null

  return (
    <SellProductDialog
      open={isOpen}
      onClose={() => closeModal('product-sell')}
      product={product}
    />
  )
}
