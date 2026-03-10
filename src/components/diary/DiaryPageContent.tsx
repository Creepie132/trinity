'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import TaskBoard from '@/components/tasks/TaskBoard'
import { useState } from 'react'
import CreateTaskSheet from '@/components/tasks/CreateTaskSheet'

export default function DiaryPageContent() {
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className="container mx-auto py-6 max-w-[95vw]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Дневник</h1>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить задачу
        </Button>
      </div>

      {/* Task board */}
      <TaskBoard />

      {/* Create task modal */}
      <CreateTaskSheet 
        open={isCreating}
        onClose={() => setIsCreating(false)}
      />
    </div>
  )
}