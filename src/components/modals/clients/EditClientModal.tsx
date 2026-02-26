'use client'

import { useModalStore } from '@/store/useModalStore'
import { EditClientSheet } from '@/components/clients/EditClientSheet'

export function EditClientModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('client-edit')
  const data = getModalData('client-edit')

  if (!data?.client) return null

  return (
    <EditClientSheet
      client={data.client}
      isOpen={isOpen}
      onClose={() => closeModal('client-edit')}
      onSaved={data?.onSaved || (() => {})}
      locale={data?.locale || 'he'}
    />
  )
}
