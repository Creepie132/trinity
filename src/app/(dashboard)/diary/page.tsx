'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Calendar, Clock, User, CheckCircle2, Circle, AlertTriangle,
  MessageSquare, Search, X, XCircle, PlayCircle, Trash2, CheckCircle,
  GripVertical, ChevronDown,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { useFeatures } from '@/hooks/useFeatures'
import { useModalStore } from '@/store/useModalStore'
import { useLanguage } from '@/contexts/LanguageContext'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { format, isToday, isTomorrow, isPast, parseISO, type Locale } from 'date-fns'
import { he, ru } from 'date-fns/locale'

// ===== Types =====
interface Task {
  id: string
  org_id: string
  created_by: string
  assigned_to: string | null
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
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
  client?: { id: string; name?: string; first_name?: string; last_name?: string; phone?: string } | null
}

type KanbanColumn = { id: Task['status']; label: string; color: string; accent: string; icon: React.ReactNode }
type PriorityFilter = 'all' | 'urgent' | 'high' | 'normal'

// ===== helpers =====
function formatPhoneForWhatsApp(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, '')
  if (clean.startsWith('0')) return '972' + clean.slice(1)
  if (clean.startsWith('972')) return clean
  return '972' + clean
}

function getClientDisplayName(client: Task['client']): string {
  if (!client) return ''
  return `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.name || ''
}

function formatDeadline(due: string, locale: Locale, lang: string): { text: string; urgent: boolean; overdue: boolean } {
  const d = parseISO(due)
  const overdue = isPast(d) && !isToday(d)
  const urgent = isToday(d) || isTomorrow(d) || overdue
  let text = ''
  if (overdue) text = lang === 'he' ? 'באיחור' : 'Просрочено'
  else if (isToday(d)) text = format(d, 'HH:mm', { locale })
  else if (isTomorrow(d)) text = (lang === 'he' ? 'מחר ' : 'Завтра ') + format(d, 'HH:mm', { locale })
  else text = format(d, 'dd MMM', { locale })
  return { text, urgent, overdue }
}

// ===== Priority dot =====
function PriorityDot({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    urgent: 'bg-red-500',
    high: 'bg-amber-400',
    normal: 'bg-blue-400',
    low: 'bg-slate-300',
  }
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1 ${map[priority] ?? map.normal}`} />
}

// ===== Kanban Card =====
interface KanbanCardProps {
  task: Task
  language: string
  dateLocale: Locale
  clients: any[]
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  onDragStart: (e: React.DragEvent, task: Task) => void
  onDragEnd: () => void
  isDragging: boolean
}

function KanbanCard({ task, language, dateLocale, clients, onComplete, onDelete, onDragStart, onDragEnd, isDragging }: KanbanCardProps) {
  const client = task.client_id ? clients.find((c: any) => c.id === task.client_id) : null
  const clientName = getClientDisplayName(client)
  const deadline = task.due_date ? formatDeadline(task.due_date, dateLocale, language) : null
  const isRTL = language === 'he'

  const priorityBorder: Record<string, string> = {
    urgent: 'border-l-red-500',
    high: 'border-l-amber-400',
    normal: 'border-l-transparent',
    low: 'border-l-transparent',
  }

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      className={[
        'group relative bg-white dark:bg-slate-800/90 rounded-2xl',
        'border border-slate-200 dark:border-slate-700 border-l-4',
        priorityBorder[task.priority] ?? 'border-l-transparent',
        'shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing',
        isDragging ? 'opacity-40 scale-95' : 'opacity-100 scale-100',
        task.status === 'completed' ? 'opacity-60' : '',
        'animate-card-in',
      ].join(' ')}
    >
      <div className={`absolute top-3 ${isRTL ? 'left-2' : 'right-2'} opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none`}>
        <GripVertical size={14} className="text-slate-400" />
      </div>

      <div className="p-3.5 space-y-2.5">
        <div className="flex items-start gap-2">
          <PriorityDot priority={task.priority} />
          <p className={`text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100 flex-1 ${task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
            {task.title}
          </p>
        </div>

        {task.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 ps-4">
            {task.description}
          </p>
        )}

        {clientName && (
          <div className="flex items-center gap-1.5 ps-4">
            <User size={11} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{clientName}</span>
          </div>
        )}

        {deadline && (
          <div className="flex items-center gap-1.5 ps-4">
            <Clock size={11} className={deadline.overdue ? 'text-red-500' : deadline.urgent ? 'text-amber-500' : 'text-slate-400'} />
            <span className={`text-xs font-medium ${deadline.overdue ? 'text-red-500' : deadline.urgent ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`}>
              {deadline.text}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60">
          {task.contact_phone && (
            <button
              onClick={e => { e.stopPropagation(); window.open(`https://wa.me/${formatPhoneForWhatsApp(task.contact_phone!)}`, '_blank') }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition text-xs font-medium"
              title="WhatsApp"
            >
              <MessageSquare size={11} />
              <span>WA</span>
            </button>
          )}
          {task.status !== 'completed' && task.status !== 'cancelled' && (
            <button
              onClick={e => { e.stopPropagation(); onComplete(task.id) }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 transition text-xs ms-auto"
              title={language === 'he' ? 'סיים' : 'Завершить'}
            >
              <CheckCircle size={11} />
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(task.id) }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition text-xs"
            title={language === 'he' ? 'מחק' : 'Удалить'}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== Kanban Column =====
interface KanbanColProps {
  col: KanbanColumn
  tasks: Task[]
  language: string
  dateLocale: Locale
  clients: any[]
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  onDrop: (status: Task['status']) => void
  draggingId: string | null
  onDragStart: (e: React.DragEvent, task: Task) => void
  onDragEnd: () => void
}

function KanbanCol({ col, tasks, language, dateLocale, clients, onComplete, onDelete, onDrop, draggingId, onDragStart, onDragEnd }: KanbanColProps) {
  const [isOver, setIsOver] = useState(false)

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsOver(true) }}
      onDragLeave={() => setIsOver(false)}
      onDrop={e => { e.preventDefault(); setIsOver(false); onDrop(col.id) }}
      className={[
        'flex flex-col min-w-[280px] max-w-[320px] rounded-2xl transition-all duration-200',
        isOver ? 'ring-2 ring-primary/40 bg-primary/5 scale-[1.01]' : 'bg-slate-50 dark:bg-slate-900/50',
      ].join(' ')}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl ${col.color}`}>
        {col.icon}
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex-1">{col.label}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.accent}`}>{tasks.length}</span>
      </div>

      {/* Drop hint */}
      {isOver && (
        <div className="mx-3 mt-2 h-12 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center">
          <span className="text-xs text-primary/60">{language === 'he' ? 'שחרר כאן' : 'Отпустите здесь'}</span>
        </div>
      )}

      {/* Cards */}
      <div className="flex flex-col gap-2 p-3 min-h-[120px] flex-1">
        {tasks.length === 0 && !isOver && (
          <div className="flex-1 flex items-center justify-center py-8">
            <span className="text-xs text-slate-400 dark:text-slate-600 italic">
              {language === 'he' ? 'אין משימות' : 'Нет задач'}
            </span>
          </div>
        )}
        {tasks.map(task => (
          <KanbanCard
            key={task.id}
            task={task}
            language={language}
            dateLocale={dateLocale}
            clients={clients}
            onComplete={onComplete}
            onDelete={onDelete}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggingId === task.id}
          />
        ))}
      </div>
    </div>
  )
}

// ===== Main Page =====
export default function DiaryPage() {
  const router = useRouter()
  const { user, orgId } = useAuth()
  const { hasDiary } = useFeatures()
  const { language } = useLanguage()
  const isRTL = language === 'he'
  const dateLocale = language === 'he' ? he : ru
  const supabase = createSupabaseBrowserClient()

  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)
  const { openModal } = useModalStore()

  const COLUMNS: KanbanColumn[] = [
    {
      id: 'open',
      label: language === 'he' ? 'פתוח' : 'Открытые',
      color: 'bg-slate-100 dark:bg-slate-800',
      accent: 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300',
      icon: <Circle size={14} className="text-slate-500" />,
    },
    {
      id: 'in_progress',
      label: language === 'he' ? 'בתהליך' : 'В процессе',
      color: 'bg-amber-50 dark:bg-amber-900/20',
      accent: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
      icon: <PlayCircle size={14} className="text-amber-500" />,
    },
    {
      id: 'completed',
      label: language === 'he' ? 'הושלם' : 'Завершено',
      color: 'bg-emerald-50 dark:bg-emerald-900/20',
      accent: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
      icon: <CheckCircle2 size={14} className="text-emerald-500" />,
    },
    {
      id: 'cancelled',
      label: language === 'he' ? 'בוטל' : 'Отменено',
      color: 'bg-slate-50 dark:bg-slate-800/40',
      accent: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
      icon: <XCircle size={14} className="text-slate-400" />,
    },
  ]

  useEffect(() => { if (!hasDiary) router.push('/dashboard') }, [hasDiary, router])
  useEffect(() => { loadTasks(); loadClients() }, [])

  async function loadTasks() {
    try {
      setIsLoading(true)
      const res = await fetch('/api/tasks')
      if (!res.ok) throw new Error('Failed')
      setTasks(await res.json())
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }

  async function loadClients() {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) setClients(await res.json())
    } catch (e) { console.error(e) }
  }

  const filteredTasks = useMemo(() => {
    let list = tasks
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        getClientDisplayName(t.client).toLowerCase().includes(q)
      )
    }
    if (priorityFilter !== 'all') {
      list = list.filter(t => t.priority === priorityFilter)
    }
    return [...list].sort((a, b) => {
      const w = (p: string) => p === 'urgent' ? 0 : p === 'high' ? 1 : 2
      return w(a.priority) - w(b.priority)
    })
  }, [tasks, searchQuery, priorityFilter])

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = { open: [], in_progress: [], completed: [], cancelled: [] }
    filteredTasks.forEach(t => { if (map[t.status]) map[t.status].push(t) })
    return map
  }, [filteredTasks])

  async function handleComplete(taskId: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' as const } : t))
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', taskId)
  }

  async function handleDelete(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
  }

  function handleDragStart(e: React.DragEvent, task: Task) {
    setDraggingTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() { setDraggingTask(null) }

  async function handleDrop(targetStatus: Task['status']) {
    if (!draggingTask || draggingTask.status === targetStatus) return
    const prev = [...tasks]
    setTasks(t => t.map(x => x.id === draggingTask.id ? { ...x, status: targetStatus } : x))
    const { error } = await supabase.from('tasks').update({ status: targetStatus }).eq('id', draggingTask.id)
    if (error) setTasks(prev)
    setDraggingTask(null)
  }

  const PRIORITY_FILTERS: { key: PriorityFilter; label: string; dot?: string }[] = [
    { key: 'all', label: language === 'he' ? 'הכל' : 'Все' },
    { key: 'urgent', label: language === 'he' ? 'דחוף' : 'Срочные', dot: 'bg-red-500' },
    { key: 'high', label: language === 'he' ? 'גבוה' : 'Высокий', dot: 'bg-amber-400' },
    { key: 'normal', label: language === 'he' ? 'רגיל' : 'Обычные', dot: 'bg-blue-400' },
  ]

  const urgentCount = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed' && t.status !== 'cancelled').length

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between">
          <div className="h-8 w-36 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          <div className="h-10 w-28 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-x-auto">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="min-w-[280px]">
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-t-2xl animate-pulse mb-2" />
              {[1, 2, 3].map(j => <div key={j} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse mb-2" />)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-20 flex-wrap gap-y-2">
        <div className="flex items-center gap-2 me-auto">
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {language === 'he' ? 'יומן משימות' : 'Дневник задач'}
          </h1>
          {urgentCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse">
              <AlertTriangle size={10} />
              {urgentCount}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={language === 'he' ? 'חיפוש...' : 'Поиск...'}
            className={`h-9 w-44 md:w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition ${isRTL ? 'pr-8 pl-8' : 'pl-8 pr-8'}`}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 ${isRTL ? 'left-2' : 'right-2'}`}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Priority filter pills */}
        <div className="flex gap-1.5">
          {PRIORITY_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setPriorityFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                priorityFilter === f.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {f.dot && <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />}
              {f.label}
            </button>
          ))}
        </div>

        {/* New task */}
        <button
          onClick={() => openModal('task-create', { onCreated: loadTasks })}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">{language === 'he' ? 'משימה חדשה' : 'Новая задача'}</span>
        </button>
      </div>

      {/* Board */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <EmptyState
            icon={<Calendar className="w-8 h-8" />}
            title={language === 'he' ? 'אין משימות' : 'Нет задач'}
            description={language === 'he' ? 'צור משימה חדשה כדי להתחיל' : 'Создайте первую задачу для начала работы'}
            action={{ label: language === 'he' ? 'צור משימה' : 'Создать задачу', onClick: () => openModal('task-create', { onCreated: loadTasks }) }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 p-4 md:p-6 min-w-max h-full">
            {COLUMNS.map(col => (
              <KanbanCol
                key={col.id}
                col={col}
                tasks={tasksByColumn[col.id] ?? []}
                language={language}
                dateLocale={dateLocale}
                clients={clients}
                onComplete={handleComplete}
                onDelete={handleDelete}
                onDrop={handleDrop}
                draggingId={draggingTask?.id ?? null}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </div>
      )}

      {/* FAB mobile */}
      <div className="md:hidden fixed bottom-20 end-4 z-30">
        <button
          onClick={() => openModal('task-create', { onCreated: loadTasks })}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
