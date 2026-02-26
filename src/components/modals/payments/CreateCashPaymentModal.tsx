'use client'

import { useModalStore } from '@/store/useModalStore'
import { CreateCashPaymentDialog } from '@/components/payments/CreateCashPaymentDialog'

export function CreateCashPaymentModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('payment-create-cash')
  const data = getModalData('payment-create-cash')

  return (
    <CreateCashPaymentDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('payment-create-cash')}
    />
  )
}
