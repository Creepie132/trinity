import { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import InventoryContent from '@/components/inventory/InventoryContent'
import InventoryStats from '@/components/inventory/InventoryStats'
import { useState } from 'react'
import AddProductSheet from '@/components/inventory/AddProductSheet'

export const metadata: Metadata = {
  title: 'Склад | Trinity CRM'
}

export default function InventoryPage() {
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className="container mx-auto py-6 max-w-[95vw]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Склад</h1>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить товар
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <InventoryStats />
      </div>

      {/* Inventory content */}
      <InventoryContent />

      {/* Add product modal */}
      <AddProductSheet 
        open={isCreating}
        onClose={() => setIsCreating(false)}
      />
    </div>
  )
}