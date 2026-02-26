'use client'

import { useModalStore } from '@/store/useModalStore'
import { CreateSubscriptionDialog } from '@/components/payments/CreateSubscriptionDialog'

export function CreateSubscriptionModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('payment-create-subscription')
  const data = getModalData('payment-create-subscription')

  return (
    <CreateSubscriptionDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('payment-create-subscription')}
    />
  )
}
