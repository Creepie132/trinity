'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Calendar, Clock, User, Filter, CheckCircle, Circle, AlertCircle, Phone, MessageSquare, Search, X } from 'lucide-react'
import { TrinityCard } from '@/components/ui/TrinityCard'
import { TrinityButton } from '@/components/ui/TrinityButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { format, isToday, isTomorrow, isPast, startOfDay, parseISO } from 'date-fns'
import { he, ru } from 'date-fns/locale'

// ===== Типы =====
interface Task {
  id: string
  org_id: string
  created_by: string
  assigned_to: string | null
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'done' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_date: string | null
  completed_at: string | null
  client_id: string | null
  visit_id: string | null
  payment_id: string | null
  contact_phone: string | null
  contact_email: string | null
  contact_address: string | null
  is_auto: boolean
  auto_type: string | null
  is_read: boolean
  created_at: string
  updated_at: string
  client?: {
    id: string
    name: string
    phone: string
  } | null
  assigned_user?: {
    user_id: string
    full_name: string
  } | null
}

type FilterType = 'all' | 'open' | 'in_progress' | 'done'

interface TaskGroup {
  key: string
  label: string
  tasks: Task[]
  color?: string
}

export default function DiaryPage() {
  const { user, orgId } = useAuth()
  const { t, language } = useLanguage()
  const isRTL = language === 'he'
  const dateLocale = language === 'he' ? he : ru

  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // ===== Загрузка задач =====
  useEffect(() => {
    loadTasks()
  }, [filter])

  async function loadTasks() {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.append('status', filter)
      }
      
      const response = await fetch(`/api/tasks?${params}`)
      if (!response.ok) throw new Error('Failed to load tasks')
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Load tasks error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // ===== Фильтрация и поиск =====
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = !searchQuery || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.client?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
  }, [tasks, searchQuery])

  // ===== Группировка задач =====
  const groupedTasks = useMemo((): TaskGroup[] => {
    const groups: TaskGroup[] = [
      { key: 'overdue', label: language === 'he' ? 'באיחור' : 'Просрочено', tasks: [], color: 'border-red-300' },
      { key: 'today', label: language === 'he' ? 'היום' : 'Сегодня', tasks: [], color: 'border-blue-300' },
      { key: 'tomorrow', label: language === 'he' ? 'מחר' : 'Завтра', tasks: [], color: 'border-green-300' },
      { key: 'later', label: language === 'he' ? 'אחר כך' : 'Позже', tasks: [] },
      { key: 'no-date', label: language === 'he' ? 'ללא תאריך' : 'Без даты', tasks: [] },
    ]

    filteredTasks.forEach((task) => {
      if (!task.due_date) {
        groups[4].tasks.push(task)
      } else {
        const dueDate = parseISO(task.due_date)
        const now = new Date()

        if (isPast(dueDate) && !isToday(dueDate) && task.status !== 'done') {
          groups[0].tasks.push(task)
        } else if (isToday(dueDate)) {
          groups[1].tasks.push(task)
        } else if (isTomorrow(dueDate)) {
          groups[2].tasks.push(task)
        } else {
          groups[3].tasks.push(task)
        }
      }
    })

    return groups.filter((group) => group.tasks.length > 0)
  }, [filteredTasks, language])

  // ===== Рендер иконки по приоритету =====
  function getTaskIcon(task: Task) {
    if (task.status === 'done') {
      return <CheckCircle className="w-5 h-5" />
    }
    if (task.status === 'cancelled') {
      return <Circle className="w-5 h-5" />
    }
    if (task.priority === 'urgent' || (task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date)))) {
      return <AlertCircle className="w-5 h-5" />
    }
    return <Circle className="w-5 h-5" />
  }

  // ===== Цвет иконки =====
  function getIconBg(task: Task) {
    if (task.status === 'done') return 'bg-green-100 dark:bg-green-900/30'
    if (task.status === 'cancelled') return 'bg-gray-100 dark:bg-gray-900/30'
    if (task.priority === 'urgent') return 'bg-red-100 dark:bg-red-900/30'
    if (task.priority === 'high') return 'bg-orange-100 dark:bg-orange-900/30'
    if (task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))) {
      return 'bg-red-100 dark:bg-red-900/30'
    }
    return 'bg-blue-100 dark:bg-blue-900/30'
  }

  // ===== Статус бейдж =====
  function getStatusBadge(task: Task) {
    const labels = {
      open: language === 'he' ? 'פתוח' : 'Открыто',
      in_progress: language === 'he' ? 'בתהליך' : 'В процессе',
      done: language === 'he' ? 'הושלם' : 'Завершено',
      cancelled: language === 'he' ? 'בוטל' : 'Отменено',
    }
    return labels[task.status] || task.status
  }

  // ===== Звонок =====
  function handleCall(phone: string) {
    window.location.href = `tel:${phone}`
  }

  // ===== WhatsApp =====
  function handleWhatsApp(phone: string) {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  // ===== Обновление статуса задачи =====
  async function updateTaskStatus(taskId: string, status: Task['status']) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('Failed to update task')
      await loadTasks()
    } catch (error) {
      console.error('Update task error:', error)
    }
  }

  // ===== Рендер карточки задачи =====
  function renderTaskCard(task: Task) {
    const quickActions = []

    if (task.contact_phone) {
      quickActions.push({
        icon: <Phone className="w-4 h-4" />,
        label: language === 'he' ? 'חייג' : 'Позвонить',
        onClick: () => handleCall(task.contact_phone!),
        color: 'bg-blue-50',
        textColor: 'text-blue-600',
        darkBg: 'dark:bg-blue-900/30',
        darkText: 'dark:text-blue-400',
      })

      quickActions.push({
        icon: <MessageSquare className="w-4 h-4" />,
        label: 'WhatsApp',
        onClick: () => handleWhatsApp(task.contact_phone!),
        color: 'bg-green-50',
        textColor: 'text-green-600',
        darkBg: 'dark:bg-green-900/30',
        darkText: 'dark:text-green-400',
      })
    }

    const detailFields = [
      task.description ? { label: language === 'he' ? 'תיאור' : 'Описание', value: task.description, type: 'multiline' as const } : null,
      task.due_date ? { label: language === 'he' ? 'תאריך יעד' : 'Срок', value: format(parseISO(task.due_date), 'dd MMM yyyy, HH:mm', { locale: dateLocale }) } : null,
      task.assigned_user ? { label: language === 'he' ? 'ממונה' : 'Назначено', value: task.assigned_user.full_name } : null,
      task.client ? { label: language === 'he' ? 'לקוח' : 'Клиент', value: task.client.name } : null,
      task.contact_phone ? { label: language === 'he' ? 'טלפון' : 'Телефон', value: task.contact_phone } : null,
      task.contact_email ? { label: language === 'he' ? 'דוא"ל' : 'Email', value: task.contact_email } : null,
      task.contact_address ? { label: language === 'he' ? 'כתובת' : 'Адрес', value: task.contact_address } : null,
    ].filter(Boolean) as any[]

    const detailActions = []

    if (task.status !== 'done') {
      detailActions.push({
        label: language === 'he' ? 'סמן כהושלם' : 'Завершить',
        icon: <CheckCircle className="w-4 h-4" />,
        onClick: () => updateTaskStatus(task.id, 'done'),
        className: 'bg-green-600 text-white hover:bg-green-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2',
      })
    }

    if (task.status === 'open') {
      detailActions.push({
        label: language === 'he' ? 'התחל עבודה' : 'В процесс',
        icon: <Clock className="w-4 h-4" />,
        onClick: () => updateTaskStatus(task.id, 'in_progress'),
        className: 'bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2',
      })
    }

    return (
      <TrinityCard
        key={task.id}
        avatar={{
          type: 'icon',
          icon: getTaskIcon(task),
          iconBg: getIconBg(task),
        }}
        title={task.title}
        subtitle={task.client?.name || task.description || ''}
        badge={{
          text: getStatusBadge(task),
          className: task.status === 'done' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : task.status === 'in_progress'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : task.status === 'cancelled'
            ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        }}
        stats={[
          task.due_date ? {
            icon: <Calendar className="w-4 h-4" />,
            text: format(parseISO(task.due_date), 'dd MMM, HH:mm', { locale: dateLocale }),
          } : null,
          task.priority !== 'normal' ? {
            icon: <AlertCircle className="w-4 h-4" />,
            text: task.priority === 'urgent' ? (language === 'he' ? 'דחוף' : 'Срочно') :
                  task.priority === 'high' ? (language === 'he' ? 'גבוה' : 'Высокий') :
                  (language === 'he' ? 'נמוך' : 'Низкий'),
          } : null,
        ].filter(Boolean) as any[]}
        quickActions={quickActions.length > 0 ? quickActions : undefined}
        drawerTitle={task.title}
        detailFields={detailFields}
        detailActions={detailActions}
        isInactive={task.status === 'done' || task.status === 'cancelled'}
        locale={language === 'he' ? 'he' : 'ru'}
      />
    )
  }

  // ===== Рендер =====
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">
          {language === 'he' ? 'טוען...' : 'Загрузка...'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {language === 'he' ? 'יומן משימות' : 'Дневник задач'}
        </h1>
        <TrinityButton
          variant="primary"
          size="md"
          icon={<Plus className="w-5 h-5" />}
          onClick={() => {/* TODO: Открыть форму создания задачи */}}
        >
          {language === 'he' ? 'משימה חדשה' : 'Новая задача'}
        </TrinityButton>
      </div>

      {/* Поиск */}
      <div className="mb-4 relative">
        <Search
          size={18}
          className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none ${
            isRTL ? 'right-3' : 'left-3'
          }`}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={language === 'he' ? 'חיפוש משימות...' : 'Поиск задач...'}
          className={`w-full py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition ${
            isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'
          }`}
          dir={isRTL ? 'rtl' : 'ltr'}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition ${
              isRTL ? 'left-3' : 'right-3'
            }`}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Фильтры */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'all', label: language === 'he' ? 'הכל' : 'Все' },
          { key: 'open', label: language === 'he' ? 'פתוח' : 'Открытые' },
          { key: 'in_progress', label: language === 'he' ? 'בתהליך' : 'В процессе' },
          { key: 'done', label: language === 'he' ? 'הושלם' : 'Завершённые' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as FilterType)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              filter === item.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Список задач */}
      {groupedTasks.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-8 h-8" />}
          title={language === 'he' ? 'אין משימות' : 'Нет задач'}
          description={language === 'he' ? 'צור משימה חדשה כדי להתחיל' : 'Создайте первую задачу для начала работы'}
          action={{
            label: language === 'he' ? 'צור משימה' : 'Создать задачу',
            onClick: () => {/* TODO */},
          }}
        />
      ) : (
        <div className="space-y-6">
          {groupedTasks.map((group) => (
            <div key={group.key}>
              <h2 className={`text-sm font-semibold text-muted-foreground mb-3 ${group.color ? `border-l-4 ${group.color} pl-3` : ''}`}>
                {group.label} ({group.tasks.length})
              </h2>
              <div className="space-y-3">
                {group.tasks.map((task) => renderTaskCard(task))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
