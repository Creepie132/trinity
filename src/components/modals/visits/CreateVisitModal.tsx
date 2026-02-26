'use client'

import { useModalStore } from '@/store/useModalStore'
import { CreateVisitDialog } from '@/components/visits/CreateVisitDialog'

export function CreateVisitModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('visit-create')
  const data = getModalData('visit-create')

  return (
    <CreateVisitDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('visit-create')}
      preselectedClientId={data?.clientId}
      preselectedDate={data?.date}
      onVisitCreated={data?.onVisitCreated}
    />
  )
}
