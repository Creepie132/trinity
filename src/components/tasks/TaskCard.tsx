import { Task, TaskPriority, TaskStatus } from '@/types/tasks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, User2 } from 'lucide-react'
import { formatDistanceToNow, isPast, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: 'Ожидает', color: 'bg-yellow-500' },
  in_progress: { label: 'В работе', color: 'bg-blue-500' },
  completed: { label: 'Завершено', color: 'bg-green-500' },
  cancelled: { label: 'Отменено', color: 'bg-gray-500' }
}

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Низкий', color: 'bg-gray-500' },
  medium: { label: 'Средний', color: 'bg-yellow-500' },
  high: { label: 'Высокий', color: 'bg-red-500' }
}

interface TaskCardProps {
  task: Task
  onEdit: () => void
  compact?: boolean
}

export default function TaskCard({ task, onEdit, compact = false }: TaskCardProps) {
  const statusBadge = statusConfig[task.status]
  const priorityBadge = priorityConfig[task.priority]
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status === 'pending'

  return (
    <div className={cn(
      "border rounded-lg p-4 space-y-3 bg-card",
      isOverdue && "border-red-500/50"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium">{task.title}</h3>
          {!compact && task.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {task.description}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Изменить
        </Button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant="secondary"
          className={cn("text-white", statusBadge.color)}
        >
          {statusBadge.label}
        </Badge>
        <Badge
          variant="secondary"
          className={cn("text-white", priorityBadge.color)}
        >
          {priorityBadge.label}
        </Badge>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        {task.due_date && (
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span className={cn(isOverdue && "text-red-500")}>
              {formatDistanceToNow(parseISO(task.due_date), {
                addSuffix: true,
                locale: ru
              })}
            </span>
          </div>
        )}
        {task.client && (
          <div className="flex items-center gap-1">
            <User2 className="w-4 h-4" />
            <span>
              {task.client.first_name} {task.client.last_name}
            </span>
          </div>
        )}
        {!compact && (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>
              {formatDistanceToNow(parseISO(task.created_at), {
                addSuffix: true,
                locale: ru
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}