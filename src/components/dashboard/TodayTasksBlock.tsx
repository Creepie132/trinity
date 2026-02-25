'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRouter } from 'next/navigation'

export default function TodayTasksBlock() {
  const { language } = useLanguage()
  const router = useRouter()
  const [todayTasks, setTodayTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const locale = language === 'he' ? 'he' : 'ru'

  useEffect(() => {
    fetch('/api/tasks?status=open')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const today = new Date()
          const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
          const filtered = data.filter((t: any) => {
            if (!t.due_date) return false
            const d = new Date(t.due_date)
            const dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
            return dStr === todayStr
          })
          setTodayTasks(filtered)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border p-4">
        <div className="h-32 animate-pulse bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">
          {locale === 'he' ? 'משימות להיום' : 'Задачи на сегодня'}
        </h3>
        <span className="text-xs text-muted-foreground">{todayTasks.length}</span>
      </div>

      {todayTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {locale === 'he' ? 'אין משימות להיום' : 'Нет задач на сегодня'}
        </p>
      ) : (
        <div className="space-y-2">
          {todayTasks.slice(0, 5).map((task: any) => (
            <div
              key={task.id}
              onClick={() => router.push('/diary')}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition"
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  task.priority === 'urgent' 
                    ? 'bg-red-500' 
                    : task.priority === 'high' 
                    ? 'bg-amber-500' 
                    : 'bg-blue-500'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                {task.due_date && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(task.due_date).toLocaleTimeString(
                      locale === 'he' ? 'he-IL' : 'ru-RU', 
                      { hour: '2-digit', minute: '2-digit' }
                    )}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
