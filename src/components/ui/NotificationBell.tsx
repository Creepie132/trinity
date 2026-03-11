'use client'

import { useState, useEffect } from 'react'
import { Bell, X, CheckCheck } from 'lucide-react'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
import { TrinityNotificationIcon } from './TrinityNotificationIcon'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface NotificationBellProps {
  locale: 'he' | 'ru'
}

const translations = {
  he: {
    title: 'התראות',
    empty: 'אין התראות',
    markRead: 'סמן הכל כנקרא',
  },
  ru: {
    title: 'Уведомления',
    empty: 'Нет уведомлений',
    markRead: 'Отметить все прочитанными',
  },
}

export function NotificationBell({ locale }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const l = translations[locale]

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  function handleOpen() {
    setIsOpen(true)
    if (unreadCount > 0) markAllRead()
  }

  const notificationList = (
    <div className="flex-1 overflow-y-auto">
      {notifications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">{l.empty}</div>
      ) : (
        <div className="space-y-1 p-1">
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
                <div className={`flex-1 min-w-0 ${n.is_read ? 'mr-5' : ''}`}>
                  <p className={`text-sm ${!n.is_read ? 'font-semibold' : ''}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
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
    </div>
  )

  return (
    <>
      <TrinityNotificationIcon
        hasNotification={unreadCount > 0}
        unreadCount={unreadCount}
        onClick={handleOpen}
        size={22}
      />

      {/* Mobile — bottom sheet */}
      {isMobile && (
        <TrinityBottomDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} title={l.title}>
          {notifications.length > 0 && unreadCount === 0 && (
            <div className="flex justify-end px-1 pb-2">
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {l.markRead}
              </button>
            </div>
          )}
          {notificationList}
        </TrinityBottomDrawer>
      )}

      {/* Desktop — modal */}
      {!isMobile && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 py-4 border-b flex-row items-center justify-between space-y-0">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <Bell className="w-5 h-5 text-primary" />
                {l.title}
                {unreadCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </DialogTitle>
              {notifications.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline ml-auto mr-8"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {l.markRead}
                </button>
              )}
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {notificationList}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
