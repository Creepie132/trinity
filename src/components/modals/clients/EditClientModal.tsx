'use client'

import { useModalStore } from '@/store/useModalStore'
import { useLanguage } from '@/contexts/LanguageContext'
import { EditClientSheet } from '@/components/clients/EditClientSheet'

export function EditClientModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  const { language } = useLanguage()

  const isOpen = isModalOpen('client-edit')
  const data = getModalData('client-edit')

  if (!data?.client) return null

  // Берём locale из data если передан, иначе из текущего языка интерфейса
  const locale = (data?.locale || language) as 'he' | 'ru'

  return (
    <EditClientSheet
      client={data.client}
      isOpen={isOpen}
      onClose={() => closeModal('client-edit')}
      onSaved={data?.onSaved || (() => {})}
      locale={locale}
    />
  )
}
