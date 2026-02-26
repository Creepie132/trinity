'use client'

import { useModalStore } from '@/store/useModalStore'
import { AdminProfileSheet } from '@/components/admin/AdminProfileSheet'

export function AdminProfileModal() {
  const { isModalOpen, closeModal } = useModalStore()
  
  const isOpen = isModalOpen('admin-profile')

  return (
    <AdminProfileSheet
      open={isOpen}
      onOpenChange={(open) => !open && closeModal('admin-profile')}
    />
  )
}
