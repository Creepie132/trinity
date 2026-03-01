'use client'

import { useModalStore } from '@/store/useModalStore'
import { EditVisitSheet } from '@/components/visits/EditVisitSheet'

export function EditVisitModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('edit-visit')
  const data = getModalData('edit-visit')

  if (!data?.visit) return null

  const locale = (data?.locale || 'ru') as 'he' | 'ru'

  return (
    <EditVisitSheet
      visit={data.visit}
      isOpen={isOpen}
      onClose={() => closeModal('edit-visit')}
      onSaved={(updated) => {
        data?.onSaved?.()
        closeModal('edit-visit')
        // Reload page to reflect changes
        window.location.reload()
      }}
      locale={locale}
      isMeetingMode={data?.isMeetingMode || false}
    />
  )
}
