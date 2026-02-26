'use client'

import { useModalStore } from '@/store/useModalStore'
import { ServiceDetailSheet } from '@/components/services/ServiceDetailSheet'

export function ServiceDetailsModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('service-details')
  const data = getModalData('service-details')

  if (!data?.service) return null

  return (
    <ServiceDetailSheet
      service={data.service}
      open={isOpen}
      onClose={() => closeModal('service-details')}
      onEdit={data?.onEdit}
    />
  )
}
