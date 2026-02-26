'use client'

import { useModalStore } from '@/store/useModalStore'
import { AddServiceDialog } from '@/components/visits/AddServiceDialog'

export function AddServiceModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('visit-add-service')
  const data = getModalData('visit-add-service')

  return (
    <AddServiceDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('visit-add-service')}
      onAddService={data?.onAddService || (() => Promise.resolve())}
    />
  )
}
