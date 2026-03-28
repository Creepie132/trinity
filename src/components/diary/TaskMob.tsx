'use client'

/**
 * TaskMob — мобильная модалка задачи по паттерну TrinityMob.
 *
 * Режимы (mode):
 *   'detail'   — просмотр задачи. MainPanel = инфо. ActionDrawer = действия.
 *   'create'   — новая задача.    MainPanel = форма. ActionDrawer = приоритет + сохранить.
 *   'edit'     — редактирование.  MainPanel = форма. ActionDrawer = приоритет + сохранить.
 *
 * Структура (идентична TrinityMob):
 *   createPortal → AnimatePresence → motion.div (bottom drawer)
 *     ├─ Pill (drag-to-close)
 *     ├─ Header (иконка-цвет, заголовок, ×)
 *     └─ SwipeZone
 *          ├─ MainPanel   (контент, смещается при свайпе)
 *          └─ ActionDrawer (шторка действий/приоритетов)
 */

import { useRef, useState, useEffect } from 'react'
import { useMobileBackTrap } from '@/hooks/useMobileBackTrap'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Check, Clock, Pencil, Trash2,
  Phone, MessageCircle, MapPin, Calendar, User, Loader2,
  CheckSquare, AlertCircle, Flag,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { he, ru } from 'date-fns/locale'
import { getClientName } from '@/lib/client-utils'
import { apiFetch } from '@/lib/api-fetch'
import { TrinitySearchDropdown } from '@/components/ui/TrinitySearch'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// ─── Типы ─────────────────────────────────────────────────────────────────────

export interface TaskMobTask {
  id: string; title: string; description?: string | null
  status: 'open' | 'in_progress' | 'done' | 'completed' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_date?: string | null
  client_id?: string | null; visit_id?: string | null
  contact_phone?: string | null; contact_email?: string | null; contact_address?: string | null
  is_auto?: boolean; auto_type?: string | null; created_at?: string
  client?: { id: string; name?: string; first_name?: string; last_name?: string } | null
  assigned_to?: string | null; address?: string | null
}

export interface TaskMobProps {
  mode: 'detail' | 'create' | 'edit'
  task?: TaskMobTask | null
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'
  onSuccess?: () => void
  onEdit?: (task: TaskMobTask) => void
  onClientClick?: (clientId: string) => void
}

// ─── Конфиги ──────────────────────────────────────────────────────────────────

type Priority = 'low' | 'normal' | 'high' | 'urgent'

const PRIORITY_CFG: Record<Priority, { dot: string; he: string; ru: string; bg: string }> = {
  low:    { dot: '#94a3b8', he: 'נמוכה',  ru: 'Низкий',  bg: 'rgba(148,163,184,0.15)' },
  normal: { dot: '#3b82f6', he: 'רגילה',  ru: 'Обычный', bg: 'rgba(59,130,246,0.15)'  },
  high:   { dot: '#f59e0b', he: 'גבוהה',  ru: 'Высокий', bg: 'rgba(245,158,11,0.15)'  },
  urgent: { dot: '#ef4444', he: 'דחופה',  ru: 'Срочный', bg: 'rgba(239,68,68,0.15)'   },
}

const STATUS_CFG: Record<string, { color: string; bg: string; he: string; ru: string }> = {
  open:        { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  he: 'פתוח',   ru: 'Открыто'    },
  in_progress: { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', he: 'בתהליך', ru: 'В процессе' },
  done:        { color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   he: 'הושלם',  ru: 'Завершено'  },
  completed:   { color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   he: 'הושלם',  ru: 'Завершено'  },
  cancelled:   { color: '#64748b', bg: 'rgba(100,116,139,0.1)',  he: 'בוטל',   ru: 'Отменено'   },
}

// ─── Утилита — ActionRow (как в TrinityMob) ───────────────────────────────────
function ActionRow({ icon, label, onClick, danger = false, color, bg }: {
  icon: React.ReactNode; label: string; onClick?: () => void
  danger?: boolean; color?: string; bg?: string
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px',
      borderRadius: 11, width: '100%', cursor: 'pointer',
      border: danger ? '1px solid rgba(239,68,68,0.22)' : '1px solid rgba(255,255,255,0.08)',
      background: 'transparent', color: danger ? '#f87171' : 'white',
      fontSize: 12, fontWeight: 500, transition: 'opacity .15s',
    }}
      onTouchStart={e => { (e.currentTarget as HTMLElement).style.opacity = '.7' }}
      onTouchEnd={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: danger ? 'rgba(239,68,68,0.14)' : (bg ?? 'rgba(255,255,255,0.07)'),
        color: danger ? '#f87171' : (color ?? 'rgba(255,255,255,0.7)'),
      }}>{icon}</div>
      <span>{label}</span>
      <span style={{ marginLeft: 'auto', fontSize: 13, color: danger ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.2)' }}>›</span>
    </button>
  )
}

// ─── Цветовые иконки приоритета ───────────────────────────────────────────────
const PRIORITY_ICONS = ['⚪', '🔵', '🟡', '🔴']

// ─── Главный компонент ────────────────────────────────────────────────────────

export function TaskMob({ mode, task, isOpen, onClose, locale, onSuccess, onEdit, onClientClick }: TaskMobProps) {
  const isHe = locale === 'he'
  const isRtl = isHe
  const BackIcon = isRtl ? ArrowRight : ArrowLeft
  const queryClient = useQueryClient()
  const supabase = createSupabaseBrowserClient()

  // ── State ──────────────────────────────────────────────────────────────────
  const [mounted,     setMounted]     = useState(false)
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [delConfirm,  setDelConfirm]  = useState(false)

  // Форма (create/edit)
  const [title,        setTitle]        = useState('')
  const [priority,     setPriority]     = useState<Priority>('normal')
  const [dueDate,      setDueDate]      = useState('')
  const [dueTime,      setDueTime]      = useState('')
  const [clientId,     setClientId]     = useState<string|null>(null)
  const [clientName,   setClientName2]  = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [address,      setAddress]      = useState('')
  const [description,  setDescription]  = useState('')
  const [reminder,     setReminder]     = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [orgUsers,     setOrgUsers]     = useState<any[]>([])
  const [clients,      setClients]      = useState<any[]>([])
  const [assignedTo,   setAssignedTo]   = useState<string|null>(null)
  const [assignedName, setAssignedName] = useState('')

  // ── Framer Motion — drag-to-close ─────────────────────────────────────────
  const y = useMotionValue(0)
  const overlayOpacity = useTransform(y, [0, 300], [1, 0])
  const isDragging  = useRef(false)
  const startY      = useRef(0)
  const startYVal   = useRef(0)
  const contentRef  = useRef<HTMLDivElement>(null)
  const drawerH     = useRef(0)

  // ── Горизонтальный свайп ──────────────────────────────────────────────────
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => { setMounted(true); return () => setMounted(false) }, [])

  useEffect(() => {
    if (isOpen) {
      y.set(0)
      document.body.style.overflow = 'hidden'
      setDrawerOpen(false)
      setDelConfirm(false)
      if (mode === 'create') { resetForm() }
      else if (mode === 'edit' && task) { fillForm(task) }
      if (mode !== 'detail') { loadClients(); loadOrgUsers() }
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, task])

  function resetForm() {
    setTitle(''); setPriority('normal'); setDueDate(''); setDueTime('')
    setClientId(null); setClientName2(''); setContactPhone(''); setAddress('')
    setDescription(''); setReminder(false); setAssignedTo(null); setAssignedName('')
  }

  function fillForm(t: TaskMobTask) {
    setTitle(t.title || ''); setPriority(t.priority || 'normal')
    setDescription(t.description || ''); setClientId(t.client_id || null)
    setContactPhone(t.contact_phone || ''); setAddress(t.address || t.contact_address || '')
    setAssignedTo(t.assigned_to || null)
    if (t.client) setClientName2(getClientName(t.client))
    if (t.due_date) {
      const dt = new Date(t.due_date)
      setDueDate(dt.toISOString().split('T')[0])
      setDueTime(dt.toTimeString().slice(0, 5))
    }
  }

  async function loadClients() {
    try {
      const r = await fetch('/api/clients/summary?limit=100')
      const d = await r.json()
      const list = d.data || d || []
      setClients(Array.isArray(list) ? list : [])
    } catch {}
  }
  async function loadOrgUsers() {
    try { const r = await fetch('/api/org-users'); if (r.ok) setOrgUsers(await r.json()) } catch {}
  }

  function handleClose() { setDrawerOpen(false); setDelConfirm(false); onClose() }

  // Back trap — LIFO: drawerOpen → потом сам drawer
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useMobileBackTrap(isOpen, handleClose)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useMobileBackTrap(drawerOpen, () => setDrawerOpen(false))

  // ── Drag-to-close ─────────────────────────────────────────────────────────
  function onHandleTouchStart(e: React.TouchEvent) {
    isDragging.current = true
    startY.current = e.touches[0].clientY; startYVal.current = y.get()
    if (contentRef.current) drawerH.current = contentRef.current.offsetHeight
  }
  function onHandleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return
    y.set(Math.max(0, startYVal.current + e.touches[0].clientY - startY.current))
  }
  function onHandleTouchEnd() {
    if (!isDragging.current) return; isDragging.current = false
    if (y.get() > drawerH.current * 0.35) {
      animate(y, drawerH.current || 600, { type: 'tween', duration: .25, ease: [.32,.72,0,1], onComplete: handleClose })
    } else { animate(y, 0, { type: 'spring', stiffness: 400, damping: 40 }) }
  }

  // ── Горизонтальный свайп ──────────────────────────────────────────────────
  function onContentTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY
  }
  function onContentTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (dy > Math.abs(dx) || Math.abs(dx) < 40) return
    if (!drawerOpen) {
      if (isRtl && dx > 50) setDrawerOpen(true)
      else if (!isRtl && dx < -50) setDrawerOpen(true)
    } else {
      if (isRtl && dx < -50) setDrawerOpen(false)
      else if (!isRtl && dx > 50) setDrawerOpen(false)
    }
  }

  // ── Мутации задачи ────────────────────────────────────────────────────────
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['tasks-diary'] })
  }
  async function handleComplete() {
    if (!task) return
    queryClient.setQueryData<any[]>(['tasks-diary'], (old=[]) =>
      old.map(t => t.id === task.id ? { ...t, status: 'completed', completed_at: new Date().toISOString() } : t))
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id)
    handleClose(); refresh()
  }
  async function handleInProgress() {
    if (!task) return
    queryClient.setQueryData<any[]>(['tasks-diary'], (old=[]) =>
      old.map(t => t.id === task.id ? { ...t, status: 'in_progress' } : t))
    await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', task.id)
    handleClose(); refresh()
  }
  async function handleDelete() {
    if (!task) return
    queryClient.setQueryData<any[]>(['tasks-diary'], (old=[]) => old.filter(t => t.id !== task.id))
    await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    handleClose(); refresh()
  }
  async function handleSubmit() {
    if (!title.trim()) { alert(isHe ? 'נא למלא כותרת' : 'Заполните заголовок'); return }
    setSaving(true)
    try {
      const due_date = dueDate ? new Date(`${dueDate}T${dueTime || '00:00'}`).toISOString() : null
      const body = { title: title.trim(), description: description || null, priority, due_date,
        assigned_to: assignedTo, client_id: clientId, contact_phone: contactPhone || null,
        address: address || null, reminder }
      const url = mode === 'edit' && task ? `/api/tasks/${task.id}` : '/api/tasks'
      await apiFetch(url, { method: mode === 'edit' ? 'PUT' : 'POST', json: body })
      onSuccess?.(); handleClose(); refresh()
    } catch { alert(isHe ? 'שגיאה' : 'Ошибка') } finally { setSaving(false) }
  }

  // ── Тема ──────────────────────────────────────────────────────────────────
  const sidebarBg = 'var(--trinity-sidebar-bg, #1a2620)'
  const drawerBg  = 'color-mix(in srgb, var(--trinity-sidebar-bg, #1a2620) 80%, black)'
  const accentBg  = 'var(--trinity-accent-bg, rgba(45,106,79,0.27))'
  const accentTxt = 'var(--trinity-accent-text, #74c69d)'
  const dateLocale = isHe ? he : ru

  // ── Данные задачи для detail ───────────────────────────────────────────────
  const pc = task ? (PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.normal) : PRIORITY_CFG.normal
  const sc = task ? (STATUS_CFG[task.status] ?? STATUS_CFG.open) : STATUS_CFG.open
  const isActive = task ? (task.status !== 'done' && task.status !== 'completed' && task.status !== 'cancelled') : false

  // ── Header icon/цвет по приоритету/режиму ─────────────────────────────────
  const headerColor = mode === 'detail' ? pc.dot : '#6366f1'
  const headerGradient = `linear-gradient(135deg, ${headerColor}99, ${headerColor}66)`
  const headerTitle = mode === 'create'
    ? (isHe ? 'משימה חדשה' : 'Новая задача')
    : mode === 'edit'
      ? (isHe ? 'עריכת משימה' : 'Редактировать')
      : (task?.title || '')

  if (!mounted || typeof document === 'undefined') return null

  // ── RENDER ────────────────────────────────────────────────────────────────
  const inp = { width: '100%', padding: '9px 11px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { fontSize: 9, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: 5, display: 'block' }

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div key="taskmob-ov" className="fixed inset-0 bg-black/50"
            style={{ opacity: overlayOpacity, zIndex: 9998 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: .2 }} onClick={handleClose} />

          {/* Bottom drawer */}
          <motion.div key="taskmob-dr" ref={contentRef}
            className="fixed bottom-0 left-0 right-0 flex flex-col"
            style={{ y, zIndex: 9999, height: 'calc(100dvh - 3rem)', background: sidebarBg,
              borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,0.07)',
              borderBottom: 'none', touchAction: 'none', overflow: 'hidden' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Pill */}
            <div className="flex-shrink-0 flex justify-center pt-3 pb-2 cursor-grab select-none"
              style={{ touchAction: 'none' }}
              onTouchStart={onHandleTouchStart} onTouchMove={onHandleTouchMove} onTouchEnd={onHandleTouchEnd}>
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>

            {/* Header */}
            <div className="flex-shrink-0 flex items-center gap-2 px-4 pb-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: headerGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckSquare size={18} color="white" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headerTitle}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>
                  {mode === 'detail'
                    ? (isHe ? 'פרטי משימה' : 'Детали задачи')
                    : mode === 'edit'
                      ? (isHe ? 'ערוך פרטים' : 'Измените детали')
                      : (isHe ? 'הוסף פרטים' : 'Заполните детали')}
                </div>
              </div>
              <button onClick={handleClose} style={{ width: 26, height: 26, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✕</button>
            </div>

            {/* Swipe zone */}
            <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}
              onTouchStart={onContentTouchStart} onTouchEnd={onContentTouchEnd}>

              {/* ══ MAIN PANEL ══ */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                overflowY: 'auto', padding: '12px 14px 24px',
                display: 'flex', flexDirection: 'column', gap: 11,
                transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
                transform: drawerOpen ? (isRtl ? 'translateX(74%)' : 'translateX(-74%)') : 'translateX(0)',
                touchAction: 'pan-y' }}>

                {/* Swipe hint */}
                <button onClick={() => setDrawerOpen(true)} style={{
                  alignSelf: 'center', padding: '5px 11px', borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.4)', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isRtl ? <>›&nbsp;{isHe ? 'החלק לפעולות' : 'Действия'}&nbsp;‹</> : <>‹&nbsp;{isHe ? 'פעולות' : 'Действия'}&nbsp;›</>}
                </button>

                {/* ── DETAIL: контент задачи ── */}
                {mode === 'detail' && task && (
                  <>
                    {/* Статус + приоритет + дедлайн */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ background: sc.bg, borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: sc.color, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3 }}>{isHe ? 'סטטוס' : 'Статус'}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: sc.color }}>{isHe ? sc.he : sc.ru}</div>
                      </div>
                      <div style={{ background: pc.bg, borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: pc.dot, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3 }}>{isHe ? 'עדיפות' : 'Приоритет'}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: pc.dot }}>{isHe ? pc.he : pc.ru}</div>
                      </div>
                    </div>
                    {task.due_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
                        <Calendar size={13} color="rgba(255,255,255,0.45)" />
                        <span style={{ fontSize: 12, color: 'white', fontWeight: 500 }}>
                          {format(parseISO(task.due_date), 'dd MMM yyyy, HH:mm', { locale: dateLocale })}
                        </span>
                      </div>
                    )}
                    {/* Birthday */}
                    {task.is_auto && task.auto_type === 'birthday' && (
                      <div style={{ background: 'rgba(249,168,212,0.12)', border: '1px solid rgba(249,168,212,0.25)', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28 }}>🎂</div>
                        <div style={{ fontSize: 12, color: '#f9a8d4', fontWeight: 600, marginTop: 4 }}>{isHe ? 'יום הולדת היום!' : 'День рождения!'}</div>
                      </div>
                    )}
                    {/* Описание */}
                    {task.description && (
                      <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: 11, padding: '10px 12px' }}>
                        <div style={{ ...lbl, color: 'rgba(251,191,36,0.6)' }}>{isHe ? 'תיאור' : 'Описание'}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.description}</div>
                      </div>
                    )}
                    {/* Клиент */}
                    {task.client_id && task.client && (
                      <button onClick={() => { onClientClick?.(task.client_id!); handleClose() }}
                        style={{ width: '100%', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 11, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', textAlign: isRtl ? 'right' : 'left' }}>
                        <User size={14} color="#818cf8" />
                        <div>
                          <div style={{ ...lbl, color: '#818cf8', marginBottom: 2 }}>{isHe ? 'לקוח' : 'Клиент'}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc' }}>{getClientName(task.client)}</div>
                        </div>
                      </button>
                    )}
                    {/* Телефон */}
                    {task.contact_phone && (
                      <div style={{ padding: '9px 11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11 }}>
                        <div style={lbl}>{isHe ? 'טלפון' : 'Телефон'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, color: 'white', fontWeight: 500, flex: 1, fontFamily: 'monospace' }} dir="ltr">{task.contact_phone}</span>
                          <button onClick={() => window.location.href = `tel:${task.contact_phone}`} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(96,165,250,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Phone size={13} color="#60a5fa" /></button>
                          <button onClick={() => window.open(`https://wa.me/${task.contact_phone!.replace(/[^0-9]/g,'').replace(/^0/,'972')}`, '_blank')} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(34,197,94,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageCircle size={13} color="#4ade80" /></button>
                        </div>
                      </div>
                    )}
                    {/* Адрес */}
                    {task.contact_address && (
                      <button onClick={() => { const a = encodeURIComponent(task.contact_address!); window.open(`https://www.google.com/maps/search/?api=1&query=${a}`, '_blank') }}
                        style={{ width: '100%', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 11, padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: isRtl ? 'right' : 'left' }}>
                        <MapPin size={13} color="#a78bfa" />
                        <span style={{ fontSize: 12, color: '#c4b5fd', flex: 1 }}>{task.contact_address}</span>
                      </button>
                    )}
                    {/* Подтверждение удаления */}
                    {delConfirm && (
                      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 13, color: '#f87171', textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>
                          {isHe ? `למחוק את «${task.title}»?` : `Удалить «${task.title}»?`}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={handleDelete} style={{ flex: 1, padding: 9, borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{isHe ? 'כן, מחק' : 'Да, удалить'}</button>
                          <button onClick={() => setDelConfirm(false)} style={{ flex: 1, padding: 9, borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>{isHe ? 'ביטול' : 'Отмена'}</button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── CREATE / EDIT: светлая форма как AddClientDialog ── */}
                {(mode === 'create' || mode === 'edit') && (
                  <div style={{
                    background: 'var(--color-background-primary, #fff)',
                    borderRadius: 16, padding: '16px 14px',
                    display: 'flex', flexDirection: 'column', gap: 14,
                    boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
                  }}>
                    {/* ── Аватар-иконка с живым приоритетом ── */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                        background: `linear-gradient(135deg, ${PRIORITY_CFG[priority].dot}cc, ${PRIORITY_CFG[priority].dot}88)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 4px 14px ${PRIORITY_CFG[priority].dot}44`,
                        transition: 'background .25s, box-shadow .25s',
                      }}>
                        <CheckSquare size={24} color="white" strokeWidth={2} />
                      </div>
                    </div>

                    {/* ── Заголовок задачи ── */}
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                        {isHe ? 'כותרת המשימה' : 'Заголовок задачи'} *
                      </label>
                      <input value={title} onChange={e => setTitle(e.target.value)} dir={isRtl ? 'rtl' : 'ltr'}
                        placeholder={isHe ? 'כותרת...' : 'Заголовок...'}
                        style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10,
                          fontSize: 15, fontWeight: 600, color: '#1e293b', background: '#fff',
                          outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color .15s' }}
                        onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                        onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'} />
                    </div>

                    {/* ── Дедлайн + Время ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                          {isHe ? 'תאריך יעד' : 'Дедлайн'}
                        </label>
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]} dir="ltr"
                          style={{ width: '100%', padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#374151', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' as const }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                          {isHe ? 'שעה' : 'Время'}
                        </label>
                        <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)}
                          disabled={!dueDate} dir="ltr"
                          style={{ width: '100%', padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#374151', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' as const, opacity: dueDate ? 1 : 0.4 }} />
                      </div>
                    </div>

                    {/* ── Клиент ── */}
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                        {isHe ? 'לקוח' : 'Клиент'}
                      </label>
                      <TrinitySearchDropdown data={clients} searchKeys={['first_name','last_name','phone']} minChars={0}
                        placeholder={isHe ? 'חיפוש לקוח...' : 'Поиск клиента...'}
                        onSelect={c => { setClientId(c.id); setClientName2(getClientName(c)); if (c.phone) setContactPhone(c.phone) }}
                        renderItem={c => (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#818cf8,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                              {(getClientName(c)?.[0] || '?').toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', margin: 0 }}>{getClientName(c)}</p>
                              {c.phone && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{c.phone}</p>}
                            </div>
                          </div>
                        )}
                        locale={locale} />
                      {clientName && (
                        <p style={{ fontSize: 11, color: '#6366f1', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={10} />{clientName}
                        </p>
                      )}
                    </div>

                    {/* ── Телефон ── */}
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                        {isHe ? 'טלפון' : 'Телефон'}
                      </label>
                      <div style={{ display: 'flex', gap: 7 }}>
                        <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} dir="ltr"
                          placeholder="+972-50-000-0000"
                          style={{ flex: 1, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#374151', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' as const }} />
                        {contactPhone && <>
                          <button onClick={() => window.location.href = `tel:${contactPhone}`}
                            style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Phone size={15} color="#3b82f6" />
                          </button>
                          <button onClick={() => window.open(`https://wa.me/${contactPhone.replace(/[^0-9]/g,'')}`, '_blank')}
                            style={{ width: 38, height: 38, borderRadius: 10, background: '#f0fdf4', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <MessageCircle size={15} color="#22c55e" />
                          </button>
                        </>}
                      </div>
                    </div>

                    {/* ── Адрес ── */}
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={10} color="#94a3b8" />{isHe ? 'כתובת' : 'Адрес'}
                      </label>
                      <input value={address} onChange={e => setAddress(e.target.value)} dir="rtl"
                        placeholder={isHe ? 'רחוב הרצל 12, תל אביב' : 'ул. Герцль 12, Тель-Авив'}
                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#374151', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' as const }} />
                    </div>

                    {/* ── Напоминание ── */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={reminder} onChange={e => setReminder(e.target.checked)}
                        style={{ width: 15, height: 15, accentColor: '#6366f1' }} />
                      <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
                        {isHe ? '🔔 תזכורת (2 שעות לפני)' : '🔔 Напоминание за 2 часа'}
                      </span>
                    </label>

                    {/* ── Описание ── */}
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                        {isHe ? 'תיאור' : 'Описание'}
                      </label>
                      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                        dir={isRtl ? 'rtl' : 'ltr'}
                        placeholder={isHe ? 'הערות למשימה...' : 'Заметки к задаче...'}
                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#374151', background: '#f8fafc', outline: 'none', resize: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }} />
                    </div>

                    {/* ── Кнопка сохранить (дублирует шторку для удобства) ── */}
                    <button onClick={handleSubmit} disabled={saving || !title.trim()}
                      style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                        background: saving || !title.trim() ? '#e2e8f0' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                        color: saving || !title.trim() ? '#94a3b8' : '#fff',
                        fontSize: 14, fontWeight: 700, cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        transition: 'background .2s', boxShadow: !title.trim() || saving ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                      }}>
                      {saving
                        ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        : <CheckSquare size={16} />}
                      {saving ? (isHe ? 'שומר...' : 'Сохранение...') : mode === 'edit'
                        ? (isHe ? 'שמור שינויים' : 'Сохранить изменения')
                        : (isHe ? 'צור משימה' : 'Создать задачу')}
                    </button>
                  </div>
                )}
              </div>{/* end main panel */}

              {/* ══ ACTION DRAWER ══ */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0, width: '82%',
                [isRtl ? 'left' : 'right']: 0,
                background: drawerBg, borderInlineStart: '1px solid rgba(255,255,255,0.08)',
                overflowY: 'auto', zIndex: 2,
                transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
                transform: drawerOpen ? 'translateX(0)' : (isRtl ? 'translateX(-100%)' : 'translateX(100%)'),
              }}>
                <div style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>

                  {/* Шапка шторки */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                      <BackIcon size={11} /><span>{isHe ? 'חזרה' : 'Назад'}</span>
                    </button>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                      {mode === 'detail' ? (isHe ? 'פעולות' : 'Действия') : (isHe ? 'עדיפות' : 'Приоритет')}
                    </span>
                  </div>

                  {/* ── DETAIL: действия ── */}
                  {mode === 'detail' && (
                    <>
                      {isActive && (
                        <ActionRow icon={<Check size={13} />} label={isHe ? 'בוצע ✓' : 'Выполнено ✓'}
                          onClick={handleComplete} color="#4ade80" bg="rgba(34,197,94,0.2)" />
                      )}
                      {isActive && task?.status === 'open' && (
                        <ActionRow icon={<Clock size={13} />} label={isHe ? 'התחל עבודה' : 'В процесс'}
                          onClick={handleInProgress} color="#60a5fa" bg="rgba(96,165,250,0.15)" />
                      )}
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
                      {onEdit && task && (
                        <ActionRow icon={<Pencil size={12} />} label={isHe ? 'עריכה' : 'Редактировать'}
                          onClick={() => { setDrawerOpen(false); onEdit(task) }} />
                      )}
                      <ActionRow icon={<Trash2 size={12} />} label={isHe ? 'מחק' : 'Удалить'}
                        onClick={() => { setDrawerOpen(false); setDelConfirm(true) }} danger />
                    </>
                  )}

                  {/* ── CREATE/EDIT: выбор приоритета + кнопка сохранить ── */}
                  {(mode === 'create' || mode === 'edit') && (
                    <>
                      {(Object.entries(PRIORITY_CFG) as [Priority, typeof PRIORITY_CFG.low][]).map(([key, cfg]) => (
                        <button key={key} onClick={() => setPriority(key)} style={{
                          display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px',
                          borderRadius: 11, width: '100%', cursor: 'pointer',
                          border: `1px solid ${priority === key ? cfg.dot : 'rgba(255,255,255,0.08)'}`,
                          background: priority === key ? `${cfg.dot}18` : 'transparent',
                          color: priority === key ? cfg.dot : 'rgba(255,255,255,0.5)',
                          fontSize: 12, fontWeight: priority === key ? 700 : 500,
                        }}>
                          <div style={{ width: 9, height: 9, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                          {isHe ? cfg.he : cfg.ru}
                          {priority === key && <Check size={11} style={{ marginLeft: 'auto' }} />}
                        </button>
                      ))}
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '3px 0' }} />
                      <button onClick={handleSubmit} disabled={saving || !title.trim()}
                        style={{ padding: '11px', borderRadius: 10, border: 'none',
                          background: saving || !title.trim() ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                          color: saving || !title.trim() ? 'rgba(255,255,255,0.3)' : '#fff',
                          fontSize: 13, fontWeight: 700, cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
                        {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckSquare size={14} />}
                        {saving ? '...' : mode === 'edit' ? (isHe ? 'שמור' : 'Сохранить') : (isHe ? 'צור משימה' : 'Создать')}
                      </button>
                      <button onClick={handleClose} style={{ padding: '8px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', width: '100%' }}>
                        {isHe ? 'ביטול' : 'Отмена'}
                      </button>
                    </>
                  )}
                </div>
              </div>{/* end action drawer */}
            </div>{/* end swipe zone */}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
