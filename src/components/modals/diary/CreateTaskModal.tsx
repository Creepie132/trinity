'use client'

import { useModalStore } from '@/store/useModalStore'
import { CreateTaskSheet } from '@/components/diary/CreateTaskSheet'
import ModalWrapper from '@/components/ModalWrapper'

export function CreateTaskModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('task-create')
  const data = getModalData('task-create')

  return (
    <ModalWrapper isOpen={isOpen} onClose={() => closeModal('task-create')}>
      <CreateTaskSheet
        isOpen={isOpen}
        onClose={() => closeModal('task-create')}
        onCreated={data?.onCreated || (() => {})}
        prefill={data?.prefill}
      />
    </ModalWrapper>
  )
}
