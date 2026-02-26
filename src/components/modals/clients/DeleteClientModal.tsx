'use client'

import { useModalStore } from '@/store/useModalStore'
import { GdprDeleteDialog } from '@/components/clients/GdprDeleteDialog'

export function DeleteClientModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('client-delete')
  const data = getModalData('client-delete')

  return (
    <GdprDeleteDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('client-delete')}
      clientId={data?.clientId}
      clientName={data?.clientName}
    />
  )
}
