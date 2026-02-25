'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Calendar, Clock, User, Filter, CheckCircle, CheckCircle2, Circle, AlertCircle, Phone, MessageSquare, Search, X } from 'lucide-react'
import { TrinityCard } from '@/components/ui/TrinityCard'
import { TrinityButton } from '@/components/ui/TrinityButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { CreateTaskSheet } from '@/components/diary/CreateTaskSheet'
import { useAuth } from '@/hooks/useAuth'
import { getClientName } from '@/lib/client-utils'
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
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  // ===== Загрузка задач =====
  useEffect(() => {
    loadTasks()
    loadClients()
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

  async function loadClients() {
    try {
      const response = await fetch('/api/clients')
      if (!response.ok) return
      const data = await response.json()
      setClients(data)
    } catch (error) {
      console.error('Load clients error:', error)
    }
  }

  // ===== Фильтрация и поиск =====
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = !searchQuery || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getTaskClientName(task).toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
  }, [tasks, searchQuery, clients])

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

  // ===== Получить имя клиента для задачи =====
  function getTaskClientName(task: Task): string {
    if (!task.client_id) return ''
    const client = clients.find((c: any) => c.id === task.client_id)
    if (!client) return ''
    return `${client.first_name || ''} ${client.last_name || ''}`.trim()
  }

  // ===== Рендер иконки по приоритету =====
  function getTaskIcon(task: Task) {
    if (task.status === 'done') {
      return <CheckCircle2 size={18} />
    }
    if (task.status === 'cancelled') {
      return <Circle size={18} />
    }
    if (task.priority === 'urgent' || (task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date)))) {
      return <AlertCircle size={18} />
    }
    if (task.status === 'in_progress') {
      return <Clock size={18} />
    }
    return <Circle size={18} />
  }

  // ===== Цвет иконки =====
  function getIconBg(task: Task) {
    if (task.status === 'done') return 'bg-emerald-50 dark:bg-emerald-900/20'
    if (task.status === 'cancelled') return 'bg-slate-50 dark:bg-slate-800'
    if (task.priority === 'urgent') return 'bg-red-50 dark:bg-red-900/20'
    if (task.priority === 'high') return 'bg-amber-50 dark:bg-amber-900/20'
    if (task.status === 'in_progress') return 'bg-blue-50 dark:bg-blue-900/20'
    if (task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))) {
      return 'bg-red-50 dark:bg-red-900/20'
    }
    return 'bg-slate-50 dark:bg-slate-800'
  }

  // ===== Статус бейдж =====
  function getStatusBadge(task: Task) {
    const labels: Record<string, Record<string, string>> = {
      open: { he: 'פתוח', ru: 'Открыта' },
      in_progress: { he: 'בביצוע', ru: 'В процессе' },
      done: { he: 'הושלם', ru: 'Завершена' },
      cancelled: { he: 'בוטל', ru: 'Отменена' },
    }
    const colors: Record<string, string> = {
      open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    }
    return {
      text: labels[task.status]?.[language] || task.status,
      className: colors[task.status] || colors.open,
    }
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
    const clientName = getTaskClientName(task)
    const badge = getStatusBadge(task)
    const quickActions = []

    if (task.contact_phone) {
      quickActions.push({
        icon: <Phone size={16} />,
        label: language === 'he' ? 'חייג' : 'Позвонить',
        onClick: () => handleCall(task.contact_phone!),
        color: 'bg-blue-50',
        textColor: 'text-blue-600',
        darkBg: 'dark:bg-blue-900/30',
        darkText: 'dark:text-blue-400',
      })

      quickActions.push({
        icon: <MessageSquare size={16} />,
        label: 'WhatsApp',
        onClick: () => handleWhatsApp(task.contact_phone!),
        color: 'bg-green-50',
        textColor: 'text-green-600',
        darkBg: 'dark:bg-green-900/30',
        darkText: 'dark:text-green-400',
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
        subtitle={task.description ? (task.description.length > 60 ? task.description.slice(0, 60) + '...' : task.description) : clientName}
        badge={badge}
        stats={[
          ...(task.due_date ? [{
            icon: <Clock size={13} />,
            text: format(parseISO(task.due_date), 'dd MMM, HH:mm', { locale: dateLocale }),
          }] : []),
          ...(clientName ? [{
            icon: <Circle size={13} />,
            text: clientName,
          }] : []),
        ]}
        quickActions={quickActions.length > 0 ? quickActions : undefined}
        drawerTitle={task.title}
        detailFields={[
          ...(task.description ? [{
            label: language === 'he' ? 'תיאור' : 'Описание',
            value: task.description,
            type: 'multiline' as const,
          }] : []),
          {
            label: language === 'he' ? 'סטטוס' : 'Статус',
            value: badge.text,
          },
          {
            label: language === 'he' ? 'עדיפות' : 'Приоритет',
            value: task.priority === 'urgent' ? '🔴 ' + (language === 'he' ? 'דחוף' : 'Срочный') :
                   task.priority === 'high' ? '🟡 ' + (language === 'he' ? 'גבוה' : 'Высокий') :
                   task.priority === 'normal' ? (language === 'he' ? 'רגיל' : 'Обычный') :
                   (language === 'he' ? 'נמוך' : 'Низкий'),
          },
          ...(task.due_date ? [{
            label: language === 'he' ? 'תאריך יעד' : 'Дедлайн',
            value: new Date(task.due_date).toLocaleString(
              language === 'he' ? 'he-IL' : 'ru-RU',
              { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
            ),
          }] : []),
          ...(clientName ? [{
            label: language === 'he' ? 'לקוח' : 'Клиент',
            value: clientName,
          }] : []),
          ...(task.contact_phone ? [{
            label: language === 'he' ? 'טלפון' : 'Телефон',
            value: task.contact_phone,
          }] : []),
          ...(task.contact_email ? [{
            label: 'Email',
            value: task.contact_email,
          }] : []),
          ...(task.contact_address ? [{
            label: language === 'he' ? 'כתובת' : 'Адрес',
            value: task.contact_address,
          }] : []),
        ]}
        detailActions={[
          ...(task.status === 'open' ? [{
            label: language === 'he' ? '▶ התחל' : '▶ Начать',
            icon: undefined,
            onClick: () => updateTaskStatus(task.id, 'in_progress'),
            className: 'border-2 border-amber-400 text-amber-600 hover:bg-amber-50',
          }] : []),
          ...(task.status === 'in_progress' ? [{
            label: language === 'he' ? '✓ סיים' : '✓ Завершить',
            icon: undefined,
            onClick: () => updateTaskStatus(task.id, 'done'),
            className: 'border-2 border-emerald-400 text-emerald-600 hover:bg-emerald-50',
          }] : []),
          ...(task.status !== 'done' && task.status !== 'cancelled' ? [{
            label: language === 'he' ? '✕ בטל' : '✕ Отменить',
            icon: undefined,
            onClick: () => updateTaskStatus(task.id, 'cancelled'),
            className: 'border border-slate-300 text-slate-500 hover:bg-slate-50',
          }] : []),
        ]}
        isInactive={task.status === 'cancelled' || task.status === 'done'}
        locale={language}
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
        {/* Десктоп кнопка */}
        <div className="hidden md:block">
          <TrinityButton
            variant="primary"
            size="md"
            icon={<Plus className="w-5 h-5" />}
            onClick={() => setCreateOpen(true)}
          >
            {language === 'he' ? 'משימה חדשה' : 'Новая задача'}
          </TrinityButton>
        </div>
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
            onClick: () => setCreateOpen(true),
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

      {/* FAB мобильный */}
      <div className="md:hidden fixed bottom-20 end-4 z-30">
        <button
          onClick={() => setCreateOpen(true)}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Форма создания задачи */}
      <CreateTaskSheet
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false)
          loadTasks()
        }}
        locale={language === 'he' ? 'he' : 'ru'}
      />
    </div>
  )
}
