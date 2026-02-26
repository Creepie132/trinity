'use client'

import { useModalStore } from '@/store/useModalStore'
import { CreateCareInstructionDialog } from '@/components/care-instructions/CreateCareInstructionDialog'

export function CareInstructionModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('care-instruction-create')
  const data = getModalData('care-instruction-create')

  return (
    <CreateCareInstructionDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('care-instruction-create')}
      onSuccess={data?.onSuccess}
    />
  )
}
