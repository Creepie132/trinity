'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Calendar, Clock, User, Filter, CheckCircle, CheckCircle2, Circle, AlertCircle, Phone, MessageSquare, Search, X, Mail, MapPin, ChevronRight, PlayCircle, XCircle, AlertTriangle } from 'lucide-react'
import { TrinityCard } from '@/components/ui/TrinityCard'
import { TrinityButton } from '@/components/ui/TrinityButton'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { TaskDesktopPanel } from '@/components/diary/TaskDesktopPanel'
import { useAuth } from '@/hooks/useAuth'
import { useModalStore } from '@/store/useModalStore'
import { getClientName } from '@/lib/client-utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
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

// ===== TaskStatusIcon - иконки статусов =====
function TaskStatusIcon({ status, priority }: { status: string; priority: string }) {
  if (status === 'done') return <CheckCircle2 size={20} className="text-emerald-500" />
  if (status === 'cancelled') return <XCircle size={20} className="text-slate-300" />
  if (status === 'in_progress') return <PlayCircle size={20} className="text-amber-500" />
  if (priority === 'urgent') return <AlertTriangle size={20} className="text-red-500" />
  if (priority === 'high') return <AlertTriangle size={20} className="text-amber-500" />
  return <Circle size={20} className="text-blue-500" />
}

export default function DiaryPage() {
  const { user, orgId } = useAuth()
  const { t, language } = useLanguage()
  const isRTL = language === 'he'
  const dateLocale = language === 'he' ? he : ru
  const supabase = createSupabaseBrowserClient()

  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [visits, setVisits] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const { openModal } = useModalStore()
  const [selectedVisit, setSelectedVisit] = useState<any>(null)
  const [desktopPanelTask, setDesktopPanelTask] = useState<Task | null>(null)

  // ===== Загрузка задач =====
  useEffect(() => {
    loadTasks()
    loadClients()
    loadVisits()
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

  async function loadVisits() {
    try {
      const response = await fetch('/api/visits')
      if (!response.ok) return
      const data = await response.json()
      setVisits(data)
    } catch (error) {
      console.error('Load visits error:', error)
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
          icon: <TaskStatusIcon status={task.status} priority={task.priority} />,
          iconBg: 'bg-transparent',
        }}
        title={task.title}
        subtitle={task.description ? (task.description.length > 60 ? task.description.slice(0, 60) + '...' : task.description) : clientName}
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
        drawerContent={(
          <div className="space-y-4">
            {/* Описание */}
            {task.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">{language === 'he' ? 'תיאור' : 'Описание'}</p>
                <p className="text-sm whitespace-pre-wrap break-words">{task.description}</p>
              </div>
            )}

            {/* Статус и приоритет */}
            <div className="flex gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.className}`}>
                {badge.text}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                task.priority === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {task.priority === 'urgent' ? '🔴' : task.priority === 'high' ? '🟡' : '⚪'}
                {' '}
                {{
                  urgent: language === 'he' ? 'דחוף' : 'Срочный',
                  high: language === 'he' ? 'גבוה' : 'Высокий',
                  normal: language === 'he' ? 'רגיל' : 'Обычный',
                  low: language === 'he' ? 'נמוך' : 'Низкий'
                }[task.priority] || task.priority}
              </span>
            </div>

            {/* Дедлайн */}
            {task.due_date && (
              <div className="flex items-center gap-2 py-2 border-b border-muted">
                <Clock size={14} className="text-muted-foreground" />
                <span className="text-sm">{new Date(task.due_date).toLocaleString(language === 'he' ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}

            {/* Клиент — КЛИКАБЕЛЬНЫЙ */}
            {task.client_id && (
              <button
                onClick={() => {
                  const client = clients.find((c: any) => c.id === task.client_id)
                  if (client) openModal('client-details', { client, locale: language === 'he' ? 'he' : 'ru' })
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition text-start"
              >
                <User size={16} className="text-slate-600" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {clientName || (language === 'he' ? 'לקוח' : 'Клиент')}
                </span>
                <ChevronRight size={14} className="text-slate-400 ms-auto" />
              </button>
            )}

            {/* Визит — КЛИКАБЕЛЬНЫЙ */}
            {task.visit_id && (
              <button
                onClick={() => {
                  const visit = visits.find((v: any) => v.id === task.visit_id)
                  if (visit) setSelectedVisit(visit)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition text-start"
              >
                <Calendar size={16} className="text-slate-600" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {language === 'he' ? 'צפה בביקור' : 'Посмотреть визит'}
                </span>
                <ChevronRight size={14} className="text-slate-400 ms-auto" />
              </button>
            )}

            {/* Контакты */}
            {(task.contact_phone || task.contact_email || task.contact_address) && (
              <div className="space-y-2 pt-2 border-t border-muted">
                <p className="text-xs text-muted-foreground">{language === 'he' ? 'יצירת קשר' : 'Контакты'}</p>
                
                {/* Телефон + WhatsApp */}
                {task.contact_phone && (
                  <div className="flex gap-2">
                    <a
                      href={`tel:${task.contact_phone}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-sm font-medium"
                    >
                      <Phone size={16} />
                      {task.contact_phone}
                    </a>
                    <a
                      href={`https://wa.me/${task.contact_phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 text-sm font-medium"
                    >
                      <MessageSquare size={16} />
                      WhatsApp
                    </a>
                  </div>
                )}

                {/* Email */}
                {task.contact_email && (
                  <a
                    href={`mailto:${task.contact_email}`}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium"
                  >
                    <Mail size={16} />
                    {task.contact_email}
                  </a>
                )}

                {/* Адрес + Навигация */}
                {task.contact_address && (
                  <button
                    onClick={() => {
                      const encoded = encodeURIComponent(task.contact_address!)
                      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
                      if (isMobile) {
                        window.location.href = `geo:0,0?q=${encoded}`
                      } else {
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank')
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium text-start"
                  >
                    <MapPin size={16} />
                    <span className="flex-1">{task.contact_address}</span>
                    <span className="text-xs opacity-60">{language === 'he' ? 'נווט' : 'Навигация'} →</span>
                  </button>
                )}
              </div>
            )}

            {/* Действия */}
            <div className="space-y-2 pt-2">
              {task.status === 'open' && (
                <button
                  onClick={() => updateTaskStatus(task.id, 'in_progress')}
                  className="w-full py-3 rounded-xl border-2 border-amber-400 text-amber-600 text-sm font-semibold hover:bg-amber-50 transition"
                >
                  ▶ {language === 'he' ? 'התחל' : 'Начать'}
                </button>
              )}
              {task.status === 'in_progress' && (
                <button
                  onClick={() => updateTaskStatus(task.id, 'done')}
                  className="w-full py-3 rounded-xl border-2 border-emerald-400 text-emerald-600 text-sm font-semibold hover:bg-emerald-50 transition"
                >
                  ✓ {language === 'he' ? 'סיים' : 'Завершить'}
                </button>
              )}
              {task.status !== 'done' && task.status !== 'cancelled' && (
                <button
                  onClick={() => updateTaskStatus(task.id, 'cancelled')}
                  className="w-full py-3 rounded-xl border border-slate-300 text-slate-500 text-sm font-medium hover:bg-slate-50 transition"
                >
                  ✕ {language === 'he' ? 'בטל' : 'Отменить'}
                </button>
              )}
            </div>
          </div>
        )}
        isInactive={task.status === 'cancelled' || task.status === 'done'}
        locale={language}
        // No onClick - TrinityCard will open drawer automatically on mobile
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

  const handleTaskClick = (task: Task) => {
    // Used for desktop table only
    setDesktopPanelTask(task)
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus as any })
        .eq('id', taskId)

      if (error) throw error

      loadTasks()
      setDesktopPanelTask(null)
    } catch (error) {
      console.error('Error updating task status:', error)
    }
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
            onClick={() => openModal('task-create')}
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
            onClick: () => openModal('task-create'),
          }}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-card rounded-2xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-muted bg-muted/30">
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{language === 'he' ? 'משימה' : 'Задача'}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{language === 'he' ? 'לקוח' : 'Клиент'}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{language === 'he' ? 'תאריך יעד' : 'Дедлайн'}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{language === 'he' ? 'עדיפות' : 'Приоритет'}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{language === 'he' ? 'סטטוס' : 'Статус'}</th>
                </tr>
              </thead>
              <tbody>
                {groupedTasks.flatMap((group) => group.tasks).map((task: Task) => {
                  const client = task.client_id ? clients.find((c: any) => c.id === task.client_id) : null
                  const clientName = client ? getClientName(client) : '—'
                  const badge = task.status === 'done'
                    ? { text: language === 'he' ? 'הושלם' : 'Выполнено', className: 'bg-emerald-100 text-emerald-700' }
                    : task.status === 'in_progress'
                    ? { text: language === 'he' ? 'בתהליך' : 'В работе', className: 'bg-amber-100 text-amber-700' }
                    : task.status === 'cancelled'
                    ? { text: language === 'he' ? 'בוטל' : 'Отменено', className: 'bg-slate-100 text-slate-500' }
                    : { text: language === 'he' ? 'פתוח' : 'Открыто', className: 'bg-blue-100 text-blue-700' }
                  
                  return (
                    <tr
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className={`border-b border-muted/50 hover:bg-muted/30 cursor-pointer transition ${
                        task.status === 'cancelled' || task.status === 'done' ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-medium">{task.title}</td>
                      <td className="py-3 px-4 text-muted-foreground">{clientName}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'ru-RU') : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            task.priority === 'urgent'
                              ? 'bg-red-100 text-red-700'
                              : task.priority === 'high'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <TaskStatusIcon status={task.status} priority={task.priority} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-6">
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
        </>
      )}

      {/* FAB мобильный */}
      <div className="md:hidden fixed bottom-20 end-4 z-30">
        <button
          onClick={() => openModal('task-create')}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Modals managed by ModalManager */}

      {/* Drawer визита */}
      {selectedVisit && (
        <TrinityBottomDrawer
          isOpen={!!selectedVisit}
          onClose={() => setSelectedVisit(null)}
          title={language === 'he' ? 'פרטי ביקור' : 'Детали визита'}
        >
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-muted">
              <span className="text-sm text-muted-foreground">{language === 'he' ? 'תאריך' : 'Дата'}</span>
              <span className="text-sm font-medium">
                {new Date(selectedVisit.scheduled_at).toLocaleDateString(language === 'he' ? 'he-IL' : 'ru-RU')}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-muted">
              <span className="text-sm text-muted-foreground">{language === 'he' ? 'שעה' : 'Время'}</span>
              <span className="text-sm font-medium">
                {new Date(selectedVisit.scheduled_at).toLocaleTimeString(language === 'he' ? 'he-IL' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-muted">
              <span className="text-sm text-muted-foreground">{language === 'he' ? 'סטטוס' : 'Статус'}</span>
              <span className="text-sm font-medium">{selectedVisit.status}</span>
            </div>
            {selectedVisit.price > 0 && (
              <div className="flex justify-between py-2 border-b border-muted">
                <span className="text-sm text-muted-foreground">{language === 'he' ? 'מחיר' : 'Цена'}</span>
                <span className="text-sm font-medium">₪{selectedVisit.price}</span>
              </div>
            )}
            {selectedVisit.notes && (
              <div className="py-2">
                <p className="text-sm text-muted-foreground mb-1">{language === 'he' ? 'הערות' : 'Заметки'}</p>
                <p className="text-sm whitespace-pre-wrap">{selectedVisit.notes}</p>
              </div>
            )}
          </div>
        </TrinityBottomDrawer>
      )}

      {/* Desktop Panel */}
      <TaskDesktopPanel
        task={desktopPanelTask}
        isOpen={!!desktopPanelTask}
        onClose={() => setDesktopPanelTask(null)}
        locale={language === 'he' ? 'he' : 'ru'}
        clients={clients}
        visits={visits}
        onStatusChange={handleTaskStatusChange}
        onClientClick={(clientId) => {
          const client = clients.find((c: any) => c.id === clientId)
          if (client) openModal('client-details', { client, locale: language === 'he' ? 'he' : 'ru' })
        }}
        onVisitClick={(visitId) => {
          const visit = visits.find((v: any) => v.id === visitId)
          if (visit) setSelectedVisit(visit)
        }}
      />
    </div>
  )
}
