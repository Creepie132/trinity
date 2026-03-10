'use client'

import { BaseModal } from './BaseModal'
import { useModalStore, ModalType } from '@/store/useModalStore'

[... импорты без изменений ...]

// Примесь для общего поведения модалок
const withBaseModal = (ModalContent: React.ComponentType<any>, modalType: ModalType) => {
  return function WrappedModal() {
    const { isModalOpen, closeModal, getModalData } = useModalStore()
    const isOpen = isModalOpen(modalType)
    const data = getModalData(modalType)

    if (!isOpen) return null

    return (
      <BaseModal 
        open={isOpen} 
        onClose={() => closeModal(modalType)}
        modalType={modalType}
      >
        <ModalContent data={data} onClose={() => closeModal(modalType)} />
      </BaseModal>
    )
  }
}

[... остальной код без изменений ...]