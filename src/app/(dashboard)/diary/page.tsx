'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Clock, Search, X, Flame, Timer, ChevronRight,
  MessageCircle, Check, Archive, Trash2, MoreHorizontal, Inbox,
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
  id: string; org_id: string; created_by: string; assigned_to: string | null
  title: string; description: string | null
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_date: string | null; completed_at: string | null
  client_id: string | null; visit_id: string | null; payment_id: string | null
  contact_phone: string | null; contact_email: string | null; contact_address: string | null
  is_auto: boolean; auto_type: string | null; is_read: boolean
  created_at: string; updated_at: string
  accept_status?: 'pending' | 'accepted' | 'rejected' | null
  rejection_reason?: string | null
  client?: { id: string; name?: string; first_name?: string; last_name?: string; phone?: string } | null
}
interface OrgUser { user_id: string; full_name: string; avatar_url?: string | null }

function getClientDisplayName(client: Task['client']): string {
  if (!client) return ''
  return `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.name || ''
}

type Bucket = 'burning' | 'today' | 'later' | 'done'
function getBucket(task: Task): Bucket {
  if (task.status === 'completed' || task.status === 'cancelled') return 'done'
  const due = task.due_date ? parseISO(task.due_date) : null
  if (task.priority === 'urgent') return 'burning'
  if (due && isPast(due) && !isToday(due)) return 'burning'
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

const PRIORITY_DOT: Record<string, string> = {
  urgent: '#ef4444', high: '#f59e0b', normal: '#3b82f6', low: '#94a3b8',
}
const PRIORITY_LABEL: Record<string, Record<string, string>> = {
  urgent: { ru: 'Срочно', he: 'דחוף' }, high: { ru: 'Высокий', he: 'גבוה' },
  normal: { ru: 'Обычный', he: 'רגיל' }, low: { ru: 'Низкий', he: 'נמוכה' },
}

// ─── TaskRow — карточка задачи (используется везде) ──────────────────────────
interface TaskRowProps {
  task: Task; lang: string; dateLocale: Locale
  onComplete: (id: string) => void; onDelete: (id: string) => void; onClick: (task: Task) => void
}
function TaskRow({ task, lang, dateLocale, onComplete, onDelete, onClick }: TaskRowProps) {
  const isHe = lang === 'he'
  const due = task.due_date ? formatDue(task.due_date, dateLocale, lang) : null
  const clientName = getClientDisplayName(task.client)
  const isDone = task.status === 'completed' || task.status === 'cancelled'
  const [menuOpen, setMenuOpen] = useState(false)
  const [completing, setCompleting] = useState(false)
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
    <div className="relative overflow-hidden rounded-xl" style={{ marginBottom: 6 }}>
      {/* Swipe reveal */}
      <div className="absolute inset-0 flex items-center gap-2 rounded-xl"
        style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', paddingInlineStart: 16,
          opacity: swipe > 10 ? Math.min((swipe - 10) / 50, 1) : 0, transition: swiping ? 'none' : 'opacity .2s' }}>
        <Check size={14} color="#fff" />
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{isHe ? 'בוצע!' : 'Готово!'}</span>
      </div>

      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${swipe}px)`, transition: swiping ? 'none' : 'transform .2s ease',
          background: isDone ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
          border: `0.5px solid ${task.priority === 'urgent' && !isDone ? 'rgba(239,68,68,.25)' : 'var(--color-border-tertiary)'}`,
          borderRadius: 12, padding: '10px 12px', cursor: 'pointer', opacity: isDone ? 0.5 : 1,
          borderInlineStart: `3px solid ${isDone ? 'transparent' : (PRIORITY_DOT[task.priority] || '#3b82f6')}`,
          animation: 'slideInRow .3s ease both',
        }}
        onClick={() => !menuOpen && onClick(task)}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
          {/* Чекбокс */}
          <button onClick={e => { e.stopPropagation(); if (!isDone && !completing) { setCompleting(true); onComplete(task.id) } }}
            style={{ width: 20, height: 20, borderRadius: '50%', border: isDone ? 'none' : `1.5px solid ${PRIORITY_DOT[task.priority] || '#94a3b8'}`,
              background: isDone ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 1, cursor: isDone ? 'default' : 'pointer', transition: 'all .15s' }}>
            {(completing || isDone) && <Check size={11} color="#fff" strokeWidth={3} />}
          </button>
          {/* Контент */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.7 : 1 }}>
              {task.title}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3, flexWrap: 'wrap' }}>
              {clientName && (
                <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
                  {clientName}
                </span>
              )}
              {due && (
                <span style={{ fontSize: 10, fontWeight: 600, color: due.overdue ? '#ef4444' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Clock size={9} />{due.text}
                </span>
              )}
              {!isDone && task.priority !== 'normal' && (
                <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 5,
                  background: task.priority === 'urgent' ? 'rgba(239,68,68,.1)' : 'rgba(245,158,11,.1)',
                  color: task.priority === 'urgent' ? '#ef4444' : '#d97706' }}>
                  {isHe ? PRIORITY_LABEL[task.priority]?.he : PRIORITY_LABEL[task.priority]?.ru}
                </span>
              )}
              {task.contact_phone && (
                <button onClick={e => { e.stopPropagation(); window.open(`https://wa.me/${task.contact_phone!.replace(/[^0-9]/g,'').replace(/^0/,'972')}`, '_blank') }}
                  style={{ fontSize: 9, fontWeight: 600, color: '#16a34a', background: 'rgba(34,197,94,.1)', border: 'none', borderRadius: 5, padding: '1px 5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <MessageCircle size={8} /> WA
                </button>
              )}
            </div>
          </div>
          {/* Меню */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
              style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', insetInlineEnd: 0, top: 28, background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)', minWidth: 130, zIndex: 50 }}
                onClick={e => e.stopPropagation()}>
                {!isDone && (
                  <button onClick={() => { onComplete(task.id); setMenuOpen(false) }}
                    style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', textAlign: 'start', fontSize: 12, color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, borderRadius: '12px 12px 0 0' }}>
                    <Check size={12} />{isHe ? 'בוצע' : 'Готово'}
                  </button>
                )}
                <button onClick={() => { onDelete(task.id); setMenuOpen(false) }}
                  style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', textAlign: 'start', fontSize: 12, color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, borderRadius: isDone ? 12 : '0 0 12px 12px' }}>
                  <Trash2 size={12} />{isHe ? 'מחק' : 'Удалить'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── BucketSection — свёртываемая секция ──────────────────────────────────────
function BucketSection({ label, icon, color, count, tasks, lang, dateLocale, onComplete, onDelete, onClick, defaultOpen = true }: {
  label: string; icon: React.ReactNode; color: string; count: number; tasks: Task[]
  lang: string; dateLocale: Locale
  onComplete: (id: string) => void; onDelete: (id: string) => void; onClick: (task: Task) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (count === 0) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, marginBottom: open ? 9 : 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: `${color}18`, color }}>{count}</span>
        <div style={{ flex: 1, height: '0.5px', background: 'var(--color-border-tertiary)' }} />
        <ChevronRight size={12} color="var(--color-text-secondary)" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && tasks.map(t => (
        <TaskRow key={t.id} task={t} lang={lang} dateLocale={dateLocale}
          onComplete={onComplete} onDelete={onDelete} onClick={onClick} />
      ))}
    </div>
  )
}

// ─── LeftPanel — тёмная панель статистики ────────────────────────────────────
function LeftPanel({ tasks, lang, allFiltered }: { tasks: Task[]; lang: string; allFiltered: Task[] }) {
  const isHe = lang === 'he'
  const active = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
  const done = tasks.filter(t => t.status === 'completed')
  const urgent = active.filter(t => t.priority === 'urgent')
  const todayDone = done.filter(t => t.completed_at && isToday(parseISO(t.completed_at)))
  const total = active.length + done.length
  const progress = total > 0 ? Math.round((done.length / total) * 100) : 0

  // По типам приоритетов
  const byPriority = [
    { key: 'urgent', color: '#ef4444', label: isHe ? 'דחוף' : 'Срочно',  count: active.filter(t => t.priority === 'urgent').length },
    { key: 'high',   color: '#f59e0b', label: isHe ? 'גבוה' : 'Высокий', count: active.filter(t => t.priority === 'high').length },
    { key: 'normal', color: '#6366f1', label: isHe ? 'רגיל' : 'Обычный', count: active.filter(t => t.priority === 'normal').length },
    { key: 'low',    color: '#94a3b8', label: isHe ? 'נמוכה' : 'Низкий',  count: active.filter(t => t.priority === 'low').length },
  ].filter(p => p.count > 0)

  return (
    <div className="flex flex-col gap-5 p-5 overflow-y-auto flex-shrink-0"
      style={{ width: 'clamp(210px, 20vw, 280px)', background: 'linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)' }}>

      {/* Заголовок */}
      <div>
        <div style={{ fontSize: 9, color: 'rgba(167,210,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
          {isHe ? 'משימות' : 'Задачи'}
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{active.length}</div>
        <div style={{ fontSize: 11, color: 'rgba(167,210,255,.38)', marginTop: 4 }}>
          {urgent.length > 0 && <span style={{ color: '#f87171' }}>{urgent.length} {isHe ? 'דחופות · ' : 'срочных · '}</span>}
          {done.length} {isHe ? 'הושלמו' : 'завершено'}
        </div>
      </div>

      {/* Прогресс */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,.3)', marginBottom: 6 }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '.07em' }}>{isHe ? 'התקדמות' : 'Прогресс'}</span>
          <span style={{ color: '#34d399', fontWeight: 700 }}>{progress}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg,#6366f1,#22c55e)', width: `${progress}%`, transition: 'width .6s ease' }} />
        </div>
      </div>

      {/* 2x2 мини-карточки */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { v: active.length,     color: '#a5b4fc', lbl: isHe ? 'פתוחות' : 'Активных' },
          { v: urgent.length,     color: '#f87171', lbl: isHe ? 'דחופות' : 'Срочных' },
          { v: todayDone.length,  color: '#34d399', lbl: isHe ? 'היום ✓' : 'Сегодня ✓' },
          { v: done.length,       color: '#94a3b8', lbl: isHe ? 'הכל ✓' : 'Всего ✓' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '9px 10px' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,.32)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* По приоритетам */}
      {byPriority.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
            {isHe ? 'לפי עדיפות' : 'По приоритету'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {byPriority.map(p => (
              <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', flex: 1 }}>{p.label}</span>
                <div style={{ width: 55, height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round((p.count / active.length) * 100)}%`, background: p.color, borderRadius: 2, transition: 'width .6s ease' }} />
                </div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', minWidth: 14, textAlign: 'end' }}>{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Нота */}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,.22)', lineHeight: 1.4 }}>
          {isHe ? 'החלק ימינה להשלמת משימה' : 'Свайп вправо = выполнено'}
        </span>
      </div>
    </div>
  )
}

// ─── MobileHero — тёмная hero-секция для мобиля ──────────────────────────────
function MobileHero({ tasks, lang, activeBucket, setActiveBucket }: {
  tasks: Task[]; lang: string
  activeBucket: Bucket | 'all'; setActiveBucket: (b: Bucket | 'all') => void
}) {
  const isHe = lang === 'he'
  const active = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
  const done = tasks.filter(t => t.status === 'completed')
  const urgent = active.filter(t => t.priority === 'urgent')
  const todayDone = done.filter(t => t.completed_at && isToday(parseISO(t.completed_at)))
  const total = active.length + done.length
  const progress = total > 0 ? Math.round((done.length / total) * 100) : 0

  const TABS: { key: Bucket | 'all'; label: string; color: string; count: number }[] = [
    { key: 'all',     label: isHe ? 'הכל' : 'Все',      color: '#a5b4fc', count: active.length },
    { key: 'burning', label: isHe ? 'בוער' : 'Горит',   color: '#f87171', count: tasks.filter(t => getBucket(t) === 'burning').length },
    { key: 'today',   label: isHe ? 'היום' : 'Сегодня', color: '#fbbf24', count: tasks.filter(t => getBucket(t) === 'today').length },
    { key: 'later',   label: isHe ? 'אחר כך' : 'Позже', color: '#818cf8', count: tasks.filter(t => getBucket(t) === 'later').length },
    { key: 'done',    label: isHe ? 'הושלם' : 'Готово', color: '#34d399', count: done.length },
  ]

  return (
    <div style={{ background: 'linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)', paddingBottom: 0 }}>
      {/* Верх: заголовок + кол-во */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
        <div>
          <div style={{ fontSize: 9, color: 'rgba(167,210,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>
            {isHe ? 'משימות' : 'Задачи'}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{active.length}</div>
          <div style={{ fontSize: 10, color: 'rgba(167,210,255,.38)', marginTop: 3 }}>
            {urgent.length > 0 && <span style={{ color: '#f87171' }}>{urgent.length} {isHe ? 'דחוף · ' : 'срочных · '}</span>}
            {todayDone.length} {isHe ? 'הושלמו היום' : 'завершено сегодня'}
          </div>
        </div>
        {/* Прогресс компактный */}
        <div style={{ textAlign: 'end' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399', lineHeight: 1 }}>{progress}%</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>{isHe ? 'התקדמות' : 'прогресс'}</div>
          <div style={{ width: 60, height: 3, borderRadius: 2, background: 'rgba(255,255,255,.1)', overflow: 'hidden', marginTop: 5, marginInlineStart: 'auto' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#6366f1,#22c55e)', borderRadius: 2 }} />
          </div>
        </div>
      </div>

      {/* Bento 3 карточки */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, padding: '0 16px 14px' }}>
        {[
          { v: active.length, c: '#a5b4fc', bg: 'rgba(99,102,241,.14)', b: 'rgba(99,102,241,.25)', lbl: isHe ? 'פתוחות' : 'Активных' },
          { v: urgent.length, c: '#f87171', bg: 'rgba(239,68,68,.14)',  b: 'rgba(239,68,68,.25)',  lbl: isHe ? 'דחופות' : 'Срочных' },
          { v: done.length,   c: '#34d399', bg: 'rgba(34,197,94,.14)',  b: 'rgba(34,197,94,.25)',  lbl: isHe ? 'ℂהושלמו' : 'Готово' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: `0.5px solid ${s.b}`, borderRadius: 12, padding: '10px 10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 9, color: s.c, opacity: .7, marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Табы bucket-секций */}
      <div style={{ display: 'flex', gap: 2, paddingInline: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveBucket(tab.key)}
            style={{ flexShrink: 0, padding: '8px 10px', borderRadius: '10px 10px 0 0', border: 'none', cursor: 'pointer',
              background: activeBucket === tab.key ? 'var(--color-background-primary)' : 'transparent',
              color: activeBucket === tab.key ? tab.color : 'rgba(255,255,255,.38)',
              fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, transition: 'all .15s',
              borderBottom: activeBucket === tab.key ? `2px solid ${tab.color}` : '2px solid transparent',
            }}>
            {tab.label}
            {tab.count > 0 && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 20,
                background: activeBucket === tab.key ? `${tab.color}18` : 'rgba(255,255,255,.1)',
                color: activeBucket === tab.key ? tab.color : 'rgba(255,255,255,.4)' }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── DiaryPage ─────────────────────────────────────────────────────────────────
export default function DiaryPage() {
  const router = useRouter()
  const { hasDiary } = useFeatures()
  const { language } = useLanguage()
  const isHe = language === 'he'
  const dir = isHe ? 'rtl' : 'ltr'
  const dateLocale = isHe ? he : ru
  const supabase = createSupabaseBrowserClient()
  const { openModal } = useModalStore()

  const [tasks,        setTasks]        = useState<Task[]>([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [sheetTask,    setSheetTask]    = useState<Task | null>(null)
  const [isSheetOpen,  setIsSheetOpen]  = useState(false)
  const [showDone,     setShowDone]     = useState(false)
  const [activeBucket, setActiveBucket] = useState<Bucket | 'all'>('all')
  const { isDemo } = useDemoMode()
  const [demoLimitOpen, setDemoLimitOpen] = useState(false)

  useEffect(() => { if (!hasDiary) router.push('/dashboard') }, [hasDiary, router])
  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setIsLoading(true)
    await Promise.all([loadTasks()])
    setIsLoading(false)
  }
  async function loadTasks() {
    try { const r = await fetch('/api/tasks'); if (r.ok) setTasks(await r.json()) } catch {}
  }

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
    const byPrio = (a: Task, b: Task) => {
      const w = (p: string) => p === 'urgent' ? 0 : p === 'high' ? 1 : p === 'normal' ? 2 : 3
      return w(a.priority) - w(b.priority)
    }
    return {
      burning: burning.sort(byPrio),
      today:   today.sort(byPrio),
      later:   later.sort(byPrio),
      done:    done.sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || '')),
    }
  }, [allFiltered])

  // Мобильный фильтр по активному табу
  const mobileFiltered = useMemo(() => {
    if (activeBucket === 'all') return allFiltered.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
    if (activeBucket === 'done') return buckets.done
    return buckets[activeBucket] || []
  }, [activeBucket, allFiltered, buckets])

  async function handleComplete(taskId: string) {
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, status: 'completed' as const, completed_at: new Date().toISOString() } : t))
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

  function openCreate() {
    if (isDemo && tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length >= 5) {
      setDemoLimitOpen(true); return
    }
    openModal('task-create', { onCreated: loadTasks })
  }

  // ── Скелетон ─────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="animate-pulse space-y-4 p-4" dir={dir}>
      <div className="h-8 w-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      <div className="hidden md:flex rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
        style={{ height: 'calc(100dvh - 220px)', minHeight: 480 }}>
        <div style={{ width: 'clamp(210px,20vw,280px)' }} className="bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 bg-gray-50 dark:bg-gray-800 p-4 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl" />)}
        </div>
      </div>
      <div className="md:hidden space-y-3">
        <div className="h-44 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl" />)}
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes fadeUp     { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes slideInRow { from { opacity:0; transform:translateX(-6px) } to { opacity:1; transform:none } }
        .anim-fadeup { animation: fadeUp .4s ease both }
      `}</style>

      <div dir={dir} className="min-h-screen pb-24 md:pb-6 space-y-4">

        {/* ── HEADER ── */}
        <div className="anim-fadeup flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              {isHe ? 'יומן משימות' : 'Задачи'}
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
              {allFiltered.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length}
              {' '}{isHe ? 'משימות פתוחות' : 'активных задач'}
            </p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white shadow-md shadow-indigo-200/60 hover:opacity-90 active:scale-95 transition-all">
            <Plus className="w-4 h-4" />
            {isHe ? 'משימה חדשה' : 'Новая задача'}
          </button>
        </div>

        {isDemo && (
          <DemoSectionBanner section="diary"
            used={tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length} />
        )}

        {/* ══════════════════════ МОБИЛЬ ══════════════════════ */}
        <div className="md:hidden anim-fadeup">
          {tasks.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <EmptyState icon={<Inbox className="w-8 h-8" />}
                title={isHe ? 'אין משימות' : 'Нет задач'}
                description={isHe ? 'צור משימה חדשה' : 'Создайте первую задачу'}
                action={{ label: isHe ? 'צור' : 'Создать', onClick: openCreate }} />
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
              {/* Hero */}
              <MobileHero tasks={allFiltered} lang={language}
                activeBucket={activeBucket} setActiveBucket={setActiveBucket} />

              {/* Поиск + список */}
              <div className="bg-white dark:bg-gray-800">
                <div className="px-3 py-3 border-b border-gray-50 dark:border-gray-700/60">
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder={isHe ? 'חיפוש...' : 'Поиск...'}
                      className="w-full ps-8 pe-8 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/25" />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700/40 px-3 py-2">
                  {mobileFiltered.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-gray-400">{isHe ? 'אין משימות' : 'Задач нет'}</p>
                    </div>
                  ) : mobileFiltered.map((t, i) => (
                    <TaskRow key={t.id} task={t} lang={language} dateLocale={dateLocale}
                      onComplete={handleComplete} onDelete={handleDelete} onClick={handleCardClick} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════ ДЕСКТОП: Split Layout ══════════════════════ */}
        <div className="hidden md:flex rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
          style={{ height: 'calc(100dvh - 220px)', minHeight: 480, animation: 'fadeUp .42s .1s ease both' }}>

          {/* ══ ЛЕВАЯ ТЁМНАЯ ПАНЕЛЬ ══ */}
          {tasks.length > 0 && (
            <LeftPanel tasks={tasks} lang={language} allFiltered={allFiltered} />
          )}

          {/* ══ ПРАВАЯ ПАНЕЛЬ ══ */}
          <div className="bg-white dark:bg-gray-800 flex flex-col min-w-0 flex-1 overflow-hidden">

            {/* Статичная зона: поиск + кнопка */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-gray-50 dark:border-gray-700/60 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder={isHe ? 'חיפוש משימה...' : 'Поиск задачи...'}
                  className="w-full ps-8 pe-8 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/25 transition-shadow" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={13} />
                  </button>
                )}
              </div>
              {/* Счётчик срочных */}
              {buckets.burning.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-xl border border-red-100 dark:border-red-800/40 flex-shrink-0">
                  <Flame size={12} />{buckets.burning.length} {isHe ? 'דחוף' : 'срочных'}
                </span>
              )}
            </div>

            {/* Скроллируемая зона: bucket секции */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {tasks.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <EmptyState icon={<Inbox className="w-9 h-9" />}
                    title={isHe ? 'אין משימות' : 'Нет задач'}
                    description={isHe ? 'צור משימה חדשה להתחלה' : 'Создайте первую задачу для начала работы'}
                    action={{ label: isHe ? 'צור משימה' : 'Создать задачу', onClick: openCreate }} />
                </div>
              ) : (
                <>
                  <BucketSection
                    label={isHe ? 'בוער' : 'Горит'}
                    icon={<Flame size={12} />} color="#ef4444"
                    count={buckets.burning.length} tasks={buckets.burning}
                    lang={language} dateLocale={dateLocale}
                    onComplete={handleComplete} onDelete={handleDelete} onClick={handleCardClick}
                    defaultOpen={true} />
                  <BucketSection
                    label={isHe ? 'היום' : 'Сегодня'}
                    icon={<Timer size={12} />} color="#f59e0b"
                    count={buckets.today.length} tasks={buckets.today}
                    lang={language} dateLocale={dateLocale}
                    onComplete={handleComplete} onDelete={handleDelete} onClick={handleCardClick}
                    defaultOpen={true} />
                  <BucketSection
                    label={isHe ? 'אחר כך' : 'Позже'}
                    icon={<Clock size={12} />} color="#6366f1"
                    count={buckets.later.length} tasks={buckets.later}
                    lang={language} dateLocale={dateLocale}
                    onComplete={handleComplete} onDelete={handleDelete} onClick={handleCardClick}
                    defaultOpen={buckets.burning.length + buckets.today.length === 0} />

                  {/* Завершённые */}
                  {buckets.done.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <button onClick={() => setShowDone(o => !o)}
                        className="w-full flex items-center gap-2 py-1 bg-transparent border-none cursor-pointer">
                        <Archive size={11} style={{ color: '#94a3b8' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                          {isHe ? `הושלמו (${buckets.done.length})` : `Завершено (${buckets.done.length})`}
                        </span>
                        <div style={{ flex: 1, height: '0.5px', background: 'var(--color-border-tertiary)' }} />
                        <ChevronRight size={12} style={{ color: '#94a3b8', transform: showDone ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
                      </button>
                      {showDone && buckets.done.slice(0, 30).map(t => (
                        <TaskRow key={t.id} task={t} lang={language} dateLocale={dateLocale}
                          onComplete={handleComplete} onDelete={handleDelete} onClick={handleCardClick} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>{/* end split layout */}

        {/* FAB мобиль */}
        <button onClick={openCreate}
          className="md:hidden fixed bottom-6 end-6 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-300/50 flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-50"
          aria-label={isHe ? 'משימה חדשה' : 'Новая задача'}>
          <Plus className="w-6 h-6" />
        </button>

        {/* TaskDetailSheet */}
        <TaskDetailSheet
          task={sheetTask as any} isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)}
          onStatusChange={handleSheetStatusChange}
          onClientClick={clientId => { setIsSheetOpen(false); openModal('client-details', { id: clientId }) }}
          onEdit={task => openModal('task-create', { editTask: task, onCreated: loadTasks })}
          onDelete={handleSheetDelete}
          locale={language as 'he' | 'ru'} />
        <DemoLimitModal open={demoLimitOpen} onClose={() => setDemoLimitOpen(false)} section="diary" />
      </div>
    </>
  )
}
