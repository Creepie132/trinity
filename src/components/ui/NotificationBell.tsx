'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'

interface NotificationBellProps {
  locale: 'he' | 'ru'
}

export function NotificationBell({ locale }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  // Загрузка уведомлений
  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications?unread_only=false')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
        setUnreadCount(data.filter((n: any) => !n.is_read).length)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Пометить все как прочитанные
  async function markAllRead() {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Опрос каждые 30 секунд
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  function handleOpen() {
    setIsOpen(true)
    if (unreadCount > 0) markAllRead()
  }

  const t = {
    he: {
      title: 'התראות',
      empty: 'אין התראות',
      markRead: 'סמן הכל כנקרא',
    },
    ru: {
      title: 'Уведомления',
      empty: 'Нет уведомлений',
      markRead: 'Прочитать все',
    },
  }

  const l = t[locale]

  return (
    <>
      {/* Иконка колокольчика */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-muted/50 transition"
      >
        <Bell size={20} className={unreadCount > 0 ? 'text-primary' : 'text-muted-foreground'} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Drawer с уведомлениями */}
      <TrinityBottomDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} title={l.title}>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">{l.empty}</div>
        ) : (
          <div className="space-y-1">
            {notifications.map((n) => (
              <a
                key={n.id}
                href={n.link || '#'}
                className={`block px-3 py-3 rounded-xl transition ${
                  !n.is_read ? 'bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.is_read ? 'font-semibold' : ''}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString(locale === 'he' ? 'he-IL' : 'ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </TrinityBottomDrawer>
    </>
  )
}
