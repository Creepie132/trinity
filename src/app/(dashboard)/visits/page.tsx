import { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import VisitCalendar from '@/components/visits/VisitCalendar'
import { useState } from 'react'
import CreateVisitSheet from '@/components/visits/CreateVisitSheet'

export const metadata: Metadata = {
  title: 'Визиты | Trinity CRM'
}

export default function VisitsPage() {
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className="container mx-auto py-6 max-w-[95vw]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Визиты</h1>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Записать визит
        </Button>
      </div>

      {/* Calendar */}
      <div className="bg-card rounded-lg border p-4">
        <VisitCalendar />
      </div>

      {/* Create visit modal */}
      <CreateVisitSheet 
        open={isCreating}
        onClose={() => setIsCreating(false)}
      />
    </div>
  )
}