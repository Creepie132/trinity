'use client'

import { useModalStore } from '@/store/useModalStore'
import { CampaignDetailsSheet } from '@/components/sms/CampaignDetailsSheet'

export function CampaignDetailsModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('sms-campaign-details')
  const data = getModalData('sms-campaign-details')

  if (!data?.campaign) return null

  return (
    <CampaignDetailsSheet
      campaign={data.campaign}
      open={isOpen}
      onClose={() => closeModal('sms-campaign-details')}
    />
  )
}
