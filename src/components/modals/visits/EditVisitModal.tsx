'use client'

import { useModalStore } from '@/store/useModalStore'
import { VisitDesktopPanel } from '@/components/visits/VisitDesktopPanel'
import { useState, useEffect } from 'react'

export function EditVisitModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('visit-edit')
  const data = getModalData('visit-edit')

  const [clients, setClients] = useState<any[]>([])
  const [visitServices, setVisitServices] = useState<any[]>([])

  useEffect(() => {
    if (isOpen && data?.visit) {
      loadClients()
      loadVisitServices(data.visit.id)
    }
  }, [isOpen, data?.visit])

  async function loadClients() {
    try {
      const response = await fetch('/api/clients')
      if (response.ok) {
        const data = await response.json()
        setClients(data)
      }
    } catch (error) {
      console.error('Failed to load clients:', error)
    }
  }

  async function loadVisitServices(visitId: string) {
    try {
      const response = await fetch(`/api/visits/${visitId}/services`)
      if (response.ok) {
        const data = await response.json()
        setVisitServices(data)
      }
    } catch (error) {
      console.error('Failed to load visit services:', error)
    }
  }

  async function handleStatusChange(visitId: string, newStatus: string) {
    try {
      const response = await fetch(`/api/visits/${visitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (response.ok) {
        data?.onSaved?.()
        closeModal('visit-edit')
        // Reload page to reflect changes
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to update visit status:', error)
    }
  }

  function handleClientClick(clientId: string) {
    const { openModal } = useModalStore.getState()
    const client = clients.find((c: any) => c.id === clientId)
    if (client) {
      openModal('client-details', { client, locale: data?.locale || 'he' })
    }
  }

  if (!data?.visit) return null

  const locale = (data?.locale || 'he') as 'he' | 'ru'

  return (
    <VisitDesktopPanel
      visit={data.visit}
      isOpen={isOpen}
      onClose={() => closeModal('visit-edit')}
      locale={locale}
      clients={clients}
      visitServices={visitServices}
      onStatusChange={handleStatusChange}
      onClientClick={handleClientClick}
    />
  )
}
