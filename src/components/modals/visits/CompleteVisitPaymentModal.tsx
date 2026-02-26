'use client'

import { useModalStore } from '@/store/useModalStore'
import { CompleteVisitPaymentDialog } from '@/components/visits/CompleteVisitPaymentDialog'

export function CompleteVisitPaymentModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('visit-complete-payment')
  const data = getModalData('visit-complete-payment')

  if (!data?.visit) return null

  return (
    <CompleteVisitPaymentDialog
      visit={data.visit}
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('visit-complete-payment')}
      onSuccess={data?.onSuccess}
    />
  )
}
