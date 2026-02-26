'use client'

import { useModalStore } from '@/store/useModalStore'
import { CreateStripePaymentDialog } from '@/components/payments/CreateStripePaymentDialog'

export function CreateStripePaymentModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('payment-create-stripe')
  const data = getModalData('payment-create-stripe')

  return (
    <CreateStripePaymentDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('payment-create-stripe')}
      clientId={data?.clientId}
      amount={data?.amount}
      onSuccess={data?.onSuccess}
    />
  )
}
