'use client'

import { useModalStore } from '@/store/useModalStore'
import { ClientDetailsModal } from './ClientDetailsModal'
import { ProductDetailsModal } from './ProductDetailsModal'

export function ModalManager() {
  return (
    <>
      <ClientDetailsModal />
      <ProductDetailsModal />
    </>
  )
}
