'use client'

import { useModalStore } from '@/store/useModalStore'
import { TaskDetailSheet } from '@/components/diary/TaskDetailSheet'

export function TaskDetailsModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('task-details')
  const data = getModalData('task-details')

  if (!data?.task) return null

  return (
    <TaskDetailSheet
      task={data.task}
      isOpen={isOpen}
      onClose={() => closeModal('task-details')}
      onTaskUpdated={data?.onTaskUpdated}
      onTaskDeleted={data?.onTaskDeleted}
    />
  )
}
