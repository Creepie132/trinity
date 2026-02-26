'use client'

import { useModalStore } from '@/store/useModalStore'
import { TaskDesktopPanel } from '@/components/diary/TaskDesktopPanel'
import { useState, useEffect } from 'react'

export function TaskDetailsModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('task-details')
  const data = getModalData('task-details')

  const [clients, setClients] = useState<any[]>([])
  const [visits, setVisits] = useState<any[]>([])

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  async function loadData() {
    try {
      const [clientsRes, visitsRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/visits'),
      ])
      
      if (clientsRes.ok) {
        const clientsData = await clientsRes.json()
        setClients(clientsData)
      }
      
      if (visitsRes.ok) {
        const visitsData = await visitsRes.json()
        setVisits(visitsData)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (response.ok) {
        closeModal('task-details')
        // Reload page to reflect changes
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to update task status:', error)
    }
  }

  function handleClientClick(clientId: string) {
    const { openModal } = useModalStore.getState()
    const client = clients.find((c: any) => c.id === clientId)
    if (client) {
      openModal('client-details', { client, locale: data?.locale || 'he' })
    }
  }

  function handleVisitClick(visitId: string) {
    const { openModal } = useModalStore.getState()
    const visit = visits.find((v: any) => v.id === visitId)
    if (visit) {
      openModal('visit-edit', { visit, locale: data?.locale || 'he' })
    }
  }

  if (!data?.task) return null

  const locale = (data?.locale || 'he') as 'he' | 'ru'

  return (
    <TaskDesktopPanel
      task={data.task}
      isOpen={isOpen}
      onClose={() => closeModal('task-details')}
      locale={locale}
      clients={clients}
      visits={visits}
      onStatusChange={handleStatusChange}
      onClientClick={handleClientClick}
      onVisitClick={handleVisitClick}
    />
  )
}
