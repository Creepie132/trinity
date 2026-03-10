import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { TaskStatus } from '@/types/tasks'
import { useTasks } from '@/hooks/useTasks'
import TaskCard from './TaskCard'
import EditTaskSheet from './EditTaskSheet'
import { cn } from '@/lib/utils'

const columns: { id: TaskStatus; title: string }[] = [
  { id: 'pending', title: 'Ожидает' },
  { id: 'in_progress', title: 'В работе' },
  { id: 'completed', title: 'Завершено' },
  { id: 'cancelled', title: 'Отменено' }
]

export default function TaskBoard() {
  const { groupedTasks, updateTask } = useTasks()
  const [editingTask, setEditingTask] = useState<string | null>(null)

  const onDragEnd = (result: any) => {
    const { source, destination, draggableId } = result

    // Dropped outside a column
    if (!destination) return

    // Dropped in the same place
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return

    // Update task status
    const newStatus = destination.droppableId as TaskStatus
    updateTask({ id: draggableId, status: newStatus })
  }

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map(column => (
            <div key={column.id} className="space-y-4">
              {/* Column header */}
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">{column.title}</h2>
                <span className="text-sm text-muted-foreground">
                  {groupedTasks[column.id]?.length || 0}
                </span>
              </div>

              {/* Task list */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[200px] p-4 rounded-lg space-y-4",
                      snapshot.isDraggingOver ? "bg-muted/50" : "bg-muted/20"
                    )}
                  >
                    {groupedTasks[column.id]?.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <TaskCard
                              task={task}
                              onEdit={() => setEditingTask(task.id)}
                              compact
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {editingTask && (
        <EditTaskSheet
          taskId={editingTask}
          open={true}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  )
}