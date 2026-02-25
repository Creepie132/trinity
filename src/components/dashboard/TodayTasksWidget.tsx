'use client'

import { CheckSquare } from 'lucide-react'
import Link from 'next/link'

interface TodayTasksWidgetProps {
  tasks: any[]
  locale: string
}

export function TodayTasksWidget({ tasks, locale }: TodayTasksWidgetProps) {
  const title = locale === 'he' ? 'משימות היום' : 'Задачи сегодня'
  const noTasks = locale === 'he' ? 'אין משימות' : 'Нет задач'
  const viewAll = locale === 'he' ? 'כל המשימות' : 'Все задачи'

  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-100 text-slate-600',
  }

  const priorityLabels = {
    he: {
      high: 'גבוה',
      medium: 'בינוני',
      low: 'נמוך',
    },
    ru: {
      high: 'Высокий',
      medium: 'Средний',
      low: 'Низкий',
    },
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{title}</h3>
        <CheckSquare size={20} className="text-slate-400" />
      </div>
      
      {tasks.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">{noTasks}</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: any) => (
            <Link 
              key={task.id} 
              href="/diary"
              className="block p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{task.title}</p>
                  {task.client_id && task.clients && (
                    <p className="text-xs text-slate-500 mt-1">
                      {task.clients.first_name} {task.clients.last_name}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-lg ${priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.low}`}>
                  {priorityLabels[locale as keyof typeof priorityLabels][task.priority as keyof typeof priorityLabels.ru] || task.priority}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {tasks.length > 0 && (
        <Link 
          href="/diary" 
          className="block text-center text-sm text-blue-600 hover:text-blue-700 mt-4"
        >
          {viewAll} →
        </Link>
      )}
    </div>
  )
}
