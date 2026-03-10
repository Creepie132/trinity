import { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import ClientList from '@/components/clients/ClientList'
import { useState } from 'react'
import CreateClientSheet from '@/components/clients/CreateClientSheet'

export const metadata: Metadata = {
  title: 'Клиенты | Trinity CRM'
}

export default function ClientsPage() {
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className="container mx-auto py-6 max-w-[95vw]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Клиенты</h1>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить клиента
        </Button>
      </div>

      {/* Client list */}
      <ClientList />

      {/* Create client modal */}
      <CreateClientSheet 
        open={isCreating}
        onClose={() => setIsCreating(false)}
      />
    </div>
  )
}