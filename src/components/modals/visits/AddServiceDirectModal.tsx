'use client'

import { useModalStore } from '@/store/useModalStore'
import { AddServiceDialog } from '@/components/visits/AddServiceDialog'
import { useAddVisitService } from '@/hooks/useVisitServices'

export function AddServiceDirectModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('add-service')
  const data = getModalData('add-service')
  const visitId = data?.visitId

  const { mutateAsync: addService, isPending } = useAddVisitService(visitId || '')

  const handleAddService = async (service: any) => {
    if (!visitId) return

    await addService({
      service_id: service.id,
      price: service.price,
      duration_minutes: service.duration_minutes,
    })
  }

  if (!visitId) return null

  return (
    <AddServiceDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('add-service')}
      onAddService={handleAddService}
      isPending={isPending}
    />
  )
}
