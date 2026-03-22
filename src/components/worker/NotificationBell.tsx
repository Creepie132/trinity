'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Notification {
  id:                   string
  type:                 string
  title:                string
  body:                 string | null
  link:                 string | null
  is_read:              boolean
  created_at:           string
  priority:             string | null
  reference_id?:        string | null
  task_accept_status?:  'pending' | 'accepted' | 'rejected' | null
  task_rejection_reason?: string | null
}

function timeAgo(iso: string, lang: string): string {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  const isHe  = lang === 'he'
  if (mins < 2)   return isHe ? 'עכשיו'             : 'сейчас'
  if (mins < 60)  return isHe ? `לפני ${mins} ד'`   : `${mins} мин назад`
  if (hours < 24) return isHe ? `לפני ${hours} ש'`  : `${hours} ч назад`
  return isHe ? `לפני ${days} ימים` : `${days} дн назад`
}

function typeIcon(type: string): string {
  if (type.includes('task'))    return '📋'
  if (type.includes('deal'))    return '💼'
  if (type.includes('lead'))    return '🎯'
  if (type.includes('alert'))   return '⚠️'
  if (type.includes('assign'))  return '👤'
  if (type.includes('mention')) return '📣'
  return '🔔'
}

// ── TaskAcceptActions ────────────────────────────────────────────────────────
function TaskAcceptActions({
  notif, lang,
  onRespond,
}: {
  notif: Notification
  lang: string
  onRespond: (notifId: string, taskId: string, action: 'accepted' | 'rejected', reason?: string) => void
}) {
  const [mode, setMode]     = useState<'buttons' | 'rejecting'>('buttons')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const isHe = lang === 'he'

  if (notif.task_accept_status === 'accepted') {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
        <Check className="w-3.5 h-3.5" />
        {isHe ? 'קיבלת' : 'Вы приняли задачу'}
      </div>
    )
  }
  if (notif.task_accept_status === 'rejected') {
    return (
      <div className="mt-2 text-xs text-red-500 font-semibold flex items-center gap-1.5 flex-wrap">
        <X className="w-3.5 h-3.5" />
        {isHe ? 'דחית' : 'Вы отклонили'}
        {notif.task_rejection_reason && (
          <span className="text-gray-400 font-normal">— {notif.task_rejection_reason}</span>
        )}
      </div>
    )
  }

  const taskId = notif.reference_id
  if (!taskId) return null

  const handleAccept = () => {
    setLoading(true)
    onRespond(notif.id, taskId, 'accepted')
  }

  const handleReject = () => {
    if (!reason.trim()) return
    setLoading(true)
    onRespond(notif.id, taskId, 'rejected', reason.trim())
  }

  if (mode === 'rejecting') {
    return (
      <div className="mt-2 space-y-2">
        <textarea
          autoFocus
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={2}
          placeholder={isHe ? 'כתוב סיבת דחייה...' : 'Напиши причину отклонения...'}
          className="w-full text-xs border border-red-200 focus:border-red-400 rounded-xl px-3 py-2 outline-none resize-none bg-red-50 placeholder:text-red-300"
          dir={isHe ? 'rtl' : 'ltr'}
        />
        <div className="flex gap-2">
          <button
            onClick={handleReject}
            disabled={!reason.trim() || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-40 transition-all"
          >
            {loading
              ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <X className="w-3 h-3" />}
            {isHe ? 'שלח דחייה' : 'Отклонить'}
          </button>
          <button
            onClick={() => { setMode('buttons'); setReason('') }}
            className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-all"
          >
            {isHe ? 'ביטול' : 'Отмена'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2 flex gap-2">
      <button
        onClick={handleAccept}
        disabled={loading}
        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-all disabled:opacity-40"
      >
        <Check className="w-3.5 h-3.5" />
        {isHe ? '✅ קבל' : '✅ Принять'}
      </button>
      <button
        onClick={() => setMode('rejecting')}
        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold hover:bg-red-100 transition-all"
      >
        <X className="w-3.5 h-3.5" />
        {isHe ? '❌ דחה' : '❌ Отклонить'}
      </button>
    </div>
  )
}

export function NotificationBell({ lang }: { lang: string }) {
  const isHe = lang === 'he'
  const [open,    setOpen]    = useState(false)
  const [data,    setData]    = useState<Notification[]>([])
  const [unread,  setUnread]  = useState(0)
  const [loading, setLoading] = useState(false)
  const dropRef   = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/worker/notifications', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setData(json.notifications ?? [])
        setUnread(json.unread ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  // Realtime — мгновенные уведомления без задержки
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    supabase.auth.getUser().then(({ data }) => {
      const userId = data?.user?.id ?? null
      if (!userId) return
      channel = supabase
        .channel(`worker-notifications:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, () => {
          // Перезагружаем все уведомления чтобы получить enriched данные
          load()
        })
        .subscribe()
    })
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [load])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = async () => {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen && unread > 0) {
      setUnread(0)
      setData(d => d.map(n => ({ ...n, is_read: true })))
      await fetch('/api/worker/notifications', { method: 'PATCH' })
    }
  }

  // ── Task accept/reject handler ──────────────────────────────────────────────
  const handleTaskRespond = async (
    notifId: string,
    taskId: string,
    action: 'accepted' | 'rejected',
    reason?: string
  ) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: reason }),
      })
      if (!res.ok) { console.error(await res.json()); return }
      setData(prev => prev.map(n =>
        n.id === notifId
          ? { ...n, task_accept_status: action, task_rejection_reason: reason ?? null }
          : n
      ))
    } catch (e) { console.error(e) }
  }

  return (
    <div className="relative" ref={dropRef}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="relative p-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
        aria-label={isHe ? 'התראות' : 'Уведомления'}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-in zoom-in duration-200">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="fixed z-[9999] w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          dir={isHe ? 'rtl' : 'ltr'}
          style={(() => {
            if (!buttonRef.current) return { top: 60, right: 16 }
            const rect = buttonRef.current.getBoundingClientRect()
            const spaceLeft = rect.left
            if (spaceLeft >= 320) {
              return { top: rect.bottom + 8, right: window.innerWidth - rect.right }
            }
            return { top: rect.bottom + 8, left: Math.max(8, rect.left - 320 + rect.width) }
          })()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-slate-900">
            <span className="text-sm font-bold text-white">
              {isHe ? '🔔 התראות' : '🔔 Уведомления'}
            </span>
            <div className="flex items-center gap-2">
              {unread === 0 && data.length > 0 && (
                <span className="text-[10px] text-slate-400">{isHe ? 'הכל נקרא' : 'Все прочитаны'}</span>
              )}
              <button
                onClick={load}
                disabled={loading}
                className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-50">
            {data.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2 text-gray-400">
                <span className="text-3xl">🎉</span>
                <p className="text-sm font-medium">{isHe ? 'אין התראות חדשות' : 'Нет уведомлений'}</p>
              </div>
            ) : (
              data.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors ${
                    !n.is_read ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  <span className="text-xl shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {timeAgo(n.created_at, lang)}
                      {n.priority === 'high' && (
                        <span className="ms-2 text-red-500 font-semibold">
                          {isHe ? '● דחוף' : '● срочно'}
                        </span>
                      )}
                    </p>
                    {/* Кнопки принять/отклонить для задач */}
                    {n.type === 'task_assigned' && (
                      <TaskAcceptActions
                        notif={n}
                        lang={lang}
                        onRespond={handleTaskRespond}
                      />
                    )}
                  </div>
                  {!n.is_read && (
                    <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
