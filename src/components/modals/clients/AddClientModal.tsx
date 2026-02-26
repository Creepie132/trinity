'use client'

import { useModalStore } from '@/store/useModalStore'
import ModalWrapper from '@/components/ModalWrapper'
import { AddClientDialog } from '@/components/clients/AddClientDialog'

export function AddClientModal() {
  const { isModalOpen, closeModal } = useModalStore()
  
  const isOpen = isModalOpen('client-add')

  return (
    <AddClientDialog 
      open={isOpen} 
      onOpenChange={(open) => !open && closeModal('client-add')} 
    />
  )
}
