'use client'

import { useModalStore } from '@/store/useModalStore'
import { CreatePaymentDialog } from '@/components/payments/CreatePaymentDialog'

export function CreatePaymentModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('payment-create')
  const data = getModalData('payment-create')

  return (
    <CreatePaymentDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('payment-create')}
      clientId={data?.clientId}
      onSuccess={data?.onSuccess}
    />
  )
}
