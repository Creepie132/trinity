'use client'

import { useClients } from '@/hooks/useClients'

export default function ClientList() {
  const { clients } = useClients()
  
  return (
    <div>Client List Component</div>
  )
}