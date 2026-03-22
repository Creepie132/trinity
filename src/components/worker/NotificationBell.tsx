'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Notification {
  id:         string
  type:       string
  title:      string
  body:       string | null
  link:       string | null
  is_read:    boolean
  created_at: string
  priority:   string | null
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
  if (type.includes('task'))   return '📋'
  if (type.includes('deal'))   return '💼'
  if (type.includes('lead'))   return '🎯'
  if (type.includes('alert'))  return '⚠️'
  if (type.includes('assign')) return '👤'
  return '🔔'
}

export function NotificationBell({ lang }: { lang: string }) {
  const isHe = lang === 'he'
  const [open,   setOpen]   = useState(false)
  const [data,   setData]   = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

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

  // Poll every 60s
  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
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
    setOpen(v => !v)
    if (!open && unread > 0) {
      // Mark all read optimistically
      setUnread(0)
      setData(d => d.map(n => ({ ...n, is_read: true })))
      await fetch('/api/worker/notifications', { method: 'PATCH' })
    }
  }

  return (
    <div className="relative" ref={dropRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-all"
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
          className={`absolute ${isHe ? 'left-0' : 'right-0'} top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
          dir={isHe ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-800">
              {isHe ? '🔔 התראות' : '🔔 Уведомления'}
            </span>
            <button
              onClick={load}
              disabled={loading}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 disabled:opacity-40"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {data.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2 text-gray-400">
                <span className="text-3xl">🎉</span>
                <p className="text-sm font-medium">{isHe ? 'אין התראות חדשות' : 'Нет уведомлений'}</p>
              </div>
            ) : (
              data.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors cursor-default ${
                    !n.is_read ? 'bg-indigo-50/40' : ''
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
