'use client'

import { useModalStore } from '@/store/useModalStore'
import { CreatePaymentLinkDialog } from '@/components/payments/CreatePaymentLinkDialog'

export function CreatePaymentLinkModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('payment-create-link')
  const data = getModalData('payment-create-link')

  return (
    <CreatePaymentLinkDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('payment-create-link')}
    />
  )
}
