'use client'

import { useModalStore } from '@/store/useModalStore'
import { CreateOrgSubscriptionDialog } from '@/components/admin/CreateOrgSubscriptionDialog'

export function OrgSubscriptionModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('org-subscription-create')
  const data = getModalData('org-subscription-create')

  return (
    <CreateOrgSubscriptionDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('org-subscription-create')}
    />
  )
}
