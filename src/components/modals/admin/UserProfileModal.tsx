'use client'

import { useModalStore } from '@/store/useModalStore'
import { UserProfileSheet } from '@/components/user/UserProfileSheet'

export function UserProfileModal() {
  const { isModalOpen, closeModal } = useModalStore()
  
  const isOpen = isModalOpen('user-profile')

  return (
    <UserProfileSheet
      isOpen={isOpen}
      onClose={() => closeModal('user-profile')}
    />
  )
}
