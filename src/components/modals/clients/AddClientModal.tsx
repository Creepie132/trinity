'use client'

import { useModalStore } from '@/store/useModalStore'
import { AddClientDialog } from '@/components/clients/AddClientDialog'

export function AddClientModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  const isOpen = isModalOpen('client-add')
  const data = getModalData('client-add')

  return (
    <AddClientDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('client-add')}
      onSuccess={data?.onSuccess}
    />
  )
}
