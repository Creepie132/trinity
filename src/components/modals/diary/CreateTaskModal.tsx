'use client'

import { useModalStore } from '@/store/useModalStore'
import { CreateTaskSheet } from '@/components/diary/CreateTaskSheet'

export function CreateTaskModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('task-create')
  const data = getModalData('task-create')

  return (
    <CreateTaskSheet
      isOpen={isOpen}
      onClose={() => closeModal('task-create')}
      onTaskCreated={data?.onTaskCreated}
      initialDate={data?.initialDate}
    />
  )
}
