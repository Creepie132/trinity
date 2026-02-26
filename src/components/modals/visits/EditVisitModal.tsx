'use client'

import { useModalStore } from '@/store/useModalStore'
import { EditVisitSheet } from '@/components/visits/EditVisitSheet'

export function EditVisitModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('visit-edit')
  const data = getModalData('visit-edit')

  if (!data?.visit) return null

  const locale = (data?.locale || 'he') as 'he' | 'ru'

  return (
    <EditVisitSheet
      visit={data.visit}
      isOpen={isOpen}
      onClose={() => closeModal('visit-edit')}
      onSaved={data?.onSaved || (() => {})}
      locale={locale}
    />
  )
}
