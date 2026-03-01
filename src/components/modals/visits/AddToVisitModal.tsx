'use client'

import { useModalStore } from '@/store/useModalStore'
import { AddServiceDialog } from '@/components/visits/AddServiceDialog'
import { useAddVisitService } from '@/hooks/useVisitServices'

export function AddToVisitModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('add-to-visit')
  const data = getModalData('add-to-visit')
  const visitId = data?.visitId

  const { mutateAsync: addService, isPending } = useAddVisitService(visitId || '')

  const handleAddService = async (service: any) => {
    if (!visitId) return

    await addService({
      visit_id: visitId,
      service_id: service.id,
      service_name: service.name,
      price: service.price,
      duration_minutes: service.duration_minutes,
    })
  }

  if (!visitId) return null

  return (
    <AddServiceDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('add-to-visit')}
      onAddService={handleAddService}
      isPending={isPending}
    />
  )
}
