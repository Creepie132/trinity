'use client'

/**
 * TaskDetailsModal — враппер для модалки деталей задачи.
 * Использует TaskDetailSheet (TrinityModalShell) вместо устаревшего TaskDesktopPanel.
 * Мутации через React Query invalidation — без window.location.reload().
 */

import { useModalStore } from '@/store/useModalStore'
import { TaskDetailSheet } from '@/components/diary/TaskDetailSheet'
import { useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export function TaskDetailsModal() {
  const { isModalOpen, closeModal, getModalData, openModal } = useModalStore()
  const queryClient = useQueryClient()
  const supabase = createSupabaseBrowserClient()

  const isOpen = isModalOpen('task-details')
  const data   = getModalData('task-details')
  const locale = (data?.locale || 'he') as 'he' | 'ru'

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['tasks-diary'] })
  }

  async function handleStatusChange(taskId: string, rawStatus: string) {
    const status = rawStatus === 'done' ? 'completed' : rawStatus
    // Optimistic update
    queryClient.setQueryData<any[]>(['tasks-diary'], (old = []) =>
      old.map((t: any) => t.id === taskId ? { ...t, status } : t))
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    closeModal('task-details')
    refresh()
  }

  async function handleDelete(taskId: string) {
    // Optimistic update
    queryClient.setQueryData<any[]>(['tasks-diary'], (old = []) =>
      old.filter((t: any) => t.id !== taskId))
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    closeModal('task-details')
    refresh()
  }

  function handleEdit(task: any) {
    closeModal('task-details')
    openModal('task-create', { editTask: task, onCreated: refresh })
  }

  function handleClientClick(clientId: string) {
    closeModal('task-details')
    openModal('client-details', { id: clientId })
  }

  if (!data?.task) return null

  return (
    <TaskDetailSheet
      task={data.task}
      isOpen={isOpen}
      onClose={() => closeModal('task-details')}
      onStatusChange={handleStatusChange}
      onDelete={handleDelete}
      onEdit={handleEdit}
      onClientClick={handleClientClick}
      locale={locale}
    />
  )
}
