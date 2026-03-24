'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Calendar, Clock, AlertTriangle, Search, X, CheckCircle2,
  Inbox, Flame, Timer, ChevronRight, Phone, MessageCircle,
  Loader2, MoreHorizontal, Check, Archive, Trash2,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { useFeatures } from '@/hooks/useFeatures'
import { useModalStore } from '@/store/useModalStore'
import { useLanguage } from '@/contexts/LanguageContext'
import { TaskDetailSheet } from '@/components/diary/TaskDetailSheet'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useDemoMode } from '@/hooks/useDemoMode'
import { DemoSectionBanner } from '@/components/demo/DemoSectionBanner'
import { DemoLimitModal } from '@/components/demo/DemoLimitModal'
import { format, isToday, isTomorrow, isPast, parseISO, isThisWeek, type Locale } from 'date-fns'
import { he, ru } from 'date-fns/locale'

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
  accept_status?: 'pending' | 'accepted' | 'rejected' | null
  rejection_reason?: string | null
  client?: { id: string; name?: string; first_name?: string; last_name?: string; phone?: string } | null
}

interface OrgUser { user_id: string; full_name: string; avatar_url?: string | null }

function getClientDisplayName(client: Task['client']): string {
  if (!client) return ''
  return `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.name || ''
}

// ── Smart bucketing ──────────────────────────────────────────────────────────
type Bucket = 'burning' | 'today' | 'later' | 'done'

function getBucket(task: Task): Bucket {
  if (task.status === 'completed' || task.status === 'cancelled') return 'done'
  const due = task.due_date ? parseISO(task.due_date) : null
  if (task.priority === 'urgent') return 'burning'
  if (due && (isPast(due) && !isToday(due))) return 'burning'
  if (task.priority === 'high' && due && isToday(due)) return 'burning'
  if (due && isToday(due)) return 'today'
  if (due && isTomorrow(due)) return 'today'
  if (task.priority === 'high') return 'today'
  if (task.status === 'in_progress') return 'today'
  return 'later'
}

function formatDue(due: string, locale: Locale, lang: string): { text: string; overdue: boolean } {
  const d = parseISO(due)
  const overdue = isPast(d) && !isToday(d)
  if (overdue) {
    const days = Math.floor((Date.now() - d.getTime()) / 86400000)
    return { text: lang === 'he' ? `באיחור ${days}י` : `${days} дн.`, overdue: true }
  }
  if (isToday(d)) return { text: format(d, 'HH:mm', { locale }), overdue: false }
  if (isTomorrow(d)) return { text: lang === 'he' ? 'מחר' : 'Завтра', overdue: false }
  if (isThisWeek(d)) return { text: format(d, 'EEE', { locale }), overdue: false }
  return { text: format(d, 'dd MMM', { locale }), overdue: false }
}

// ── TaskRow — одна строка в Smart Inbox ──────────────────────────────────────
const PRIORITY_DOT: Record<string, string> = {
  urgent: '#ef4444', high: '#f59e0b', normal: '#3b82f6', low: '#94a3b8',
}
const PRIORITY_LABEL: Record<string, Record<string, string>> = {
  urgent: { ru: 'Срочно',  he: 'דחוף'  },
  high:   { ru: 'Высокий', he: 'גבוה'  },
  normal: { ru: 'Обычный', he: 'רגיל'  },
  low:    { ru: 'Низкий',  he: 'נמוכה' },
}

interface TaskRowProps {
  task: Task
  lang: string
  dateLocale: Locale
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  onClick: (task: Task) => void
}

function TaskRow({ task, lang, dateLocale, onComplete, onDelete, onClick }: TaskRowProps) {
  const isHe = lang === 'he'
  const due = task.due_date ? formatDue(task.due_date, dateLocale, lang) : null
  const clientName = getClientDisplayName(task.client)
  const isDone = task.status === 'completed' || task.status === 'cancelled'
  const [menuOpen, setMenuOpen] = useState(false)
  const [completing, setCompleting] = useState(false)

  // swipe to complete
  const touchStartX = useRef(0)
  const [swipe, setSwipe] = useState(0)
  const [swiping, setSwiping] = useState(false)

  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; setSwiping(true) }
  function onTouchMove(e: React.TouchEvent) {
    if (!swiping) return
    const dx = e.touches[0].clientX - touchStartX.current
    setSwipe(Math.max(0, Math.min(dx, 90)))
  }
  async function onTouchEnd() {
    if (swipe > 60 && !isDone) { setCompleting(true); await onComplete(task.id) }
    setSwipe(0); setSwiping(false)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ marginBottom: 6 }}>
      {/* swipe reveal */}
      <div className="absolute inset-0 flex items-center gap-2 rounded-2xl"
        style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', paddingLeft: 16, opacity: swipe > 10 ? Math.min((swipe - 10) / 50, 1) : 0, transition: swiping ? 'none' : 'opacity .2s' }}>
        <Check size={16} color="#fff" />
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{isHe ? 'בוצע!' : 'Готово!'}</span>
      </div>

      <div
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${swipe}px)`, transition: swiping ? 'none' : 'transform .2s ease', position: 'relative',
          background: isDone ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
          border: `1.5px solid ${task.priority === 'urgent' && !isDone ? 'rgba(239,68,68,0.3)' : task.priority === 'high' && !isDone ? 'rgba(245,158,11,0.25)' : 'var(--color-border-tertiary)'}`,
          borderRadius: 16, padding: '12px 14px', cursor: 'pointer', opacity: isDone ? 0.55 : 1,
          borderLeft: `4px solid ${isDone ? 'transparent' : (PRIORITY_DOT[task.priority] || '#3b82f6')}`,
        }}
        onClick={() => !menuOpen && onClick(task)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Complete button */}
          <button
            onClick={e => { e.stopPropagation(); if (!isDone && !completing) { setCompleting(true); onComplete(task.id) } }}
            style={{ width: 22, height: 22, borderRadius: '50%', border: isDone ? 'none' : `1.5px solid ${PRIORITY_DOT[task.priority] || '#94a3b8'}`,
              background: isDone ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, cursor: isDone ? 'default' : 'pointer', transition: 'all .15s' }}>
            {(completing || isDone) && <Check size={12} color="#fff" strokeWidth={3} />}
          </button>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.7 : 1 }}>
              {task.title}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              {clientName && (
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366f1', flexShrink: 0, display: 'inline-block' }} />
                  {clientName}
                </span>
              )}
              {due && (
                <span style={{ fontSize: 11, fontWeight: 600, color: due.overdue ? '#ef4444' : 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={10} style={{ flexShrink: 0 }} />
                  {due.text}
                </span>
              )}
              {!isDone && task.priority !== 'normal' && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 5,
                  background: task.priority === 'urgent' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                  color: task.priority === 'urgent' ? '#ef4444' : '#d97706' }}>
                  {isHe ? PRIORITY_LABEL[task.priority]?.he : PRIORITY_LABEL[task.priority]?.ru}
                </span>
              )}
              {task.contact_phone && (
                <button onClick={e => { e.stopPropagation(); window.open(`https://wa.me/${task.contact_phone!.replace(/[^0-9]/g,'').replace(/^0/,'972')}`, '_blank') }}
                  style={{ fontSize: 10, fontWeight: 600, color: '#16a34a', background: 'rgba(34,197,94,0.1)', border: 'none', borderRadius: 5, padding: '1px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <MessageCircle size={9} /> WA
                </button>
              )}
            </div>
          </div>

          {/* Menu */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
              style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
              <MoreHorizontal size={15} />
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', right: 0, top: 30, background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 140, zIndex: 50 }}
                onClick={e => e.stopPropagation()}>
                {!isDone && (
                  <button onClick={() => { onComplete(task.id); setMenuOpen(false) }}
                    style={{ width: '100%', padding: '9px 14px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: 13, color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderRadius: '12px 12px 0 0' }}>
                    <Check size={13} />{isHe ? 'בוצע' : 'Готово'}
                  </button>
                )}
                <button onClick={() => { onDelete(task.id); setMenuOpen(false) }}
                  style={{ width: '100%', padding: '9px 14px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: 13, color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderRadius: isDone ? 12 : '0 0 12px 12px' }}>
                  <Trash2 size={13} />{isHe ? 'מחק' : 'Удалить'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── InboxSection ──────────────────────────────────────────────────────────────
function InboxSection({ label, icon, color, count, tasks, lang, dateLocale, onComplete, onDelete, onClick, defaultOpen = true }: {
  label: string; icon: React.ReactNode; color: string; count: number
  tasks: Task[]; lang: string; dateLocale: Locale
  onComplete: (id: string) => void; onDelete: (id: string) => void; onClick: (task: Task) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (count === 0 && defaultOpen) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, marginBottom: open ? 10 : 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: `${color}18`, color }}>{count}</span>
        <div style={{ flex: 1, height: '0.5px', background: 'var(--color-border-tertiary)' }} />
        <ChevronRight size={13} color="var(--color-text-tertiary)" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && tasks.map(t => (
        <TaskRow key={t.id} task={t} lang={lang} dateLocale={dateLocale}
          onComplete={onComplete} onDelete={onDelete} onClick={onClick} />
      ))}
    </div>
  )
}

// ── StatsBar ─────────────────────────────────────────────────────────────────
function StatsBar({ tasks, lang }: { tasks: Task[]; lang: string }) {
  const isHe = lang === 'he'
  const active = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
  const done = tasks.filter(t => t.status === 'completed')
  const urgent = active.filter(t => t.priority === 'urgent')
  const total = active.length
  const progress = total > 0 ? Math.round((done.length / (done.length + total)) * 100) : 0

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
      {[
        { label: isHe ? 'פתוחות' : 'Активных', value: total, color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
        { label: isHe ? 'דחופות' : 'Срочных',  value: urgent.length, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
        { label: isHe ? 'הושלמו' : 'Сегодня ✓', value: done.filter(t => t.completed_at && isToday(parseISO(t.completed_at))).length, color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
      ].map(s => (
        <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '8px 14px', minWidth: 80, flex: '1 1 80px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
        </div>
      ))}
      <div style={{ background: 'var(--color-background-secondary)', borderRadius: 12, padding: '8px 14px', flex: '2 1 120px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isHe ? 'התקדמות' : 'Прогресс'}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)' }}>{progress}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: 'var(--color-border-tertiary)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg,#6366f1,#22c55e)', width: `${progress}%`, transition: 'width .5s ease' }} />
        </div>
      </div>
    </div>
  )
}

// ── DiaryPage ─────────────────────────────────────────────────────────────────
export default function DiaryPage() {
  const router = useRouter()
  const { hasDiary } = useFeatures()
  const { language } = useLanguage()
  const isHe = language === 'he'
  const isRTL = isHe
  const dateLocale = isHe ? he : ru
  const supabase = createSupabaseBrowserClient()
  const { openModal } = useModalStore()

  const [tasks,    setTasks]    = useState<Task[]>([])
  const [clients,  setClients]  = useState<any[]>([])
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [sheetTask,    setSheetTask]    = useState<Task | null>(null)
  const [isSheetOpen,  setIsSheetOpen]  = useState(false)
  const [showDone,     setShowDone]     = useState(false)
  const { isDemo } = useDemoMode()
  const [demoLimitOpen, setDemoLimitOpen] = useState(false)

  useEffect(() => { if (!hasDiary) router.push('/dashboard') }, [hasDiary, router])
  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setIsLoading(true)
    await Promise.all([loadTasks(), loadClients(), loadOrgUsers()])
    setIsLoading(false)
  }
  async function loadTasks()   { try { const r = await fetch('/api/tasks');           if (r.ok) setTasks(await r.json()) } catch {} }
  async function loadClients() { try { const r = await fetch('/api/clients');         if (r.ok) setClients(await r.json()) } catch {} }
  async function loadOrgUsers(){ try { const r = await fetch('/api/org-users');       if (r.ok) setOrgUsers(await r.json()) } catch {} }

  const allFiltered = useMemo(() => {
    if (!searchQuery) return tasks
    const q = searchQuery.toLowerCase()
    return tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      getClientDisplayName(t.client).toLowerCase().includes(q)
    )
  }, [tasks, searchQuery])

  const buckets = useMemo(() => {
    const burning: Task[] = [], today: Task[] = [], later: Task[] = [], done: Task[] = []
    allFiltered.forEach(t => {
      const b = getBucket(t)
      if (b === 'burning') burning.push(t)
      else if (b === 'today') today.push(t)
      else if (b === 'later') later.push(t)
      else done.push(t)
    })
    const sortByPriority = (a: Task, b: Task) => {
      const w = (p: string) => p === 'urgent' ? 0 : p === 'high' ? 1 : p === 'normal' ? 2 : 3
      return w(a.priority) - w(b.priority)
    }
    return {
      burning: burning.sort(sortByPriority),
      today:   today.sort(sortByPriority),
      later:   later.sort(sortByPriority),
      done:    done.sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || '')),
    }
  }, [allFiltered])

  async function handleComplete(taskId: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' as const, completed_at: new Date().toISOString() } : t))
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', taskId)
  }
  async function handleDelete(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
  }
  function handleCardClick(task: Task) {
    if (window.innerWidth < 768) { setSheetTask(task); setIsSheetOpen(true) }
    else openModal('task-details', { task, locale: language as 'he' | 'ru' })
  }
  async function handleSheetStatusChange(taskId: string, rawStatus: string) {
    const status = (rawStatus === 'done' ? 'completed' : rawStatus) as Task['status']
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    setIsSheetOpen(false)
  }
  async function handleSheetDelete(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    setIsSheetOpen(false)
  }

  const urgentCount = buckets.burning.length

  if (isLoading) return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }} dir={isRTL ? 'rtl' : 'ltr'}>
      <div style={{ height: 32, width: 180, background: 'var(--color-border-tertiary)', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
      {[1,2,3].map(i => <div key={i} style={{ height: 70, background: 'var(--color-background-secondary)', borderRadius: 16, animation: 'pulse 1.5s infinite' }} />)}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', position: 'sticky', top: 0, zIndex: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
          <Inbox size={18} style={{ color: '#6366f1' }} />
          <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
            {isHe ? 'תיבת משימות' : 'Задачи'}
          </h1>
          {urgentCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.12)', color: '#ef4444', animation: 'pulse 2s infinite', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Flame size={10} />{urgentCount}
            </span>
          )}
        </div>

        {/* search */}
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }} />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={isHe ? 'חיפוש...' : 'Поиск...'}
            style={{ height: 34, width: 180, paddingLeft: 30, paddingRight: searchQuery ? 28 : 10, borderRadius: 10, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', fontSize: 13, color: 'var(--color-text-primary)', outline: 'none' }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 0 }}><X size={12} /></button>
          )}
        </div>

        <button onClick={() => {
            if (isDemo && tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length >= 5) { setDemoLimitOpen(true); return }
            openModal('task-create', { onCreated: loadTasks })
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Plus size={14} />
          <span className="hidden sm:inline">{isHe ? 'משימה חדשה' : 'Новая задача'}</span>
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px' }}>
        {isDemo && (
          <div style={{ marginBottom: 16 }}>
            <DemoSectionBanner section="diary" used={tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length} />
          </div>
        )}

        {tasks.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <EmptyState
              icon={<Inbox className="w-8 h-8" />}
              title={isHe ? 'תיבת הדואר ריקה' : 'Нет задач'}
              description={isHe ? 'צור משימה חדשה כדי להתחיל' : 'Создайте первую задачу для начала работы'}
              action={{ label: isHe ? 'צור משימה' : 'Создать задачу', onClick: () => openModal('task-create', { onCreated: loadTasks }) }}
            />
          </div>
        ) : (
          <>
            <StatsBar tasks={tasks} lang={language} />

            <InboxSection
              label={isHe ? 'בוער' : 'Горит'}
              icon={<Flame size={13} />}
              color="#ef4444"
              count={buckets.burning.length}
              tasks={buckets.burning}
              lang={language} dateLocale={dateLocale}
              onComplete={handleComplete} onDelete={handleDelete} onClick={handleCardClick}
              defaultOpen={true}
            />
            <InboxSection
              label={isHe ? 'היום' : 'Сегодня'}
              icon={<Timer size={13} />}
              color="#f59e0b"
              count={buckets.today.length}
              tasks={buckets.today}
              lang={language} dateLocale={dateLocale}
              onComplete={handleComplete} onDelete={handleDelete} onClick={handleCardClick}
              defaultOpen={true}
            />
            <InboxSection
              label={isHe ? 'אחר כך' : 'Позже'}
              icon={<Clock size={13} />}
              color="#6366f1"
              count={buckets.later.length}
              tasks={buckets.later}
              lang={language} dateLocale={dateLocale}
              onComplete={handleComplete} onDelete={handleDelete} onClick={handleCardClick}
              defaultOpen={buckets.burning.length + buckets.today.length === 0}
            />

            {/* Done section toggle */}
            {buckets.done.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setShowDone(o => !o)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', width: '100%' }}>
                  <Archive size={13} style={{ color: '#94a3b8' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {isHe ? `הושלמו (${buckets.done.length})` : `Завершено (${buckets.done.length})`}
                  </span>
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--color-border-tertiary)' }} />
                  <ChevronRight size={13} style={{ color: '#94a3b8', transform: showDone ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
                </button>
                {showDone && buckets.done.slice(0, 20).map(t => (
                  <TaskRow key={t.id} task={t} lang={language} dateLocale={dateLocale}
                    onComplete={handleComplete} onDelete={handleDelete} onClick={handleCardClick} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sheet for mobile */}
      <TaskDetailSheet
        task={sheetTask as any} isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)}
        onStatusChange={handleSheetStatusChange}
        onClientClick={clientId => { setIsSheetOpen(false); openModal('client-details', { id: clientId }) }}
        onEdit={task => openModal('task-create', { editTask: task, onCreated: loadTasks })}
        onDelete={handleSheetDelete}
        locale={language as 'he' | 'ru'}
      />
      <DemoLimitModal open={demoLimitOpen} onClose={() => setDemoLimitOpen(false)} section="diary" />
    </div>
  )
}
