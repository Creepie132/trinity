'use client'

import { useModalStore } from '@/store/useModalStore'
import { CreateServiceDialog } from '@/components/services/CreateServiceDialog'

export function CreateServiceModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('service-create')
  const data = getModalData('service-create')

  return (
    <CreateServiceDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('service-create')}
      onSuccess={data?.onSuccess}
    />
  )
}
