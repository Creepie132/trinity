'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, CheckCheck, Phone, MessageCircle, Check, X } from 'lucide-react'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
import { TrinityNotificationIcon } from './TrinityNotificationIcon'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface NotificationMetadata {
  invited_user_email?: string
  invited_user_id?: string
  org_id?: string
  org_name?: string
  invited_by_email?: string
  invited_by_phone?: string
  // transfer_request
  transfer_request_id?: string
  from_org_id?: string
  to_org_id?: string
  from_org_name?: string
  to_org_name?: string
  items_count?: number
  // transfer_result
  status?: string
}

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body?: string
  link?: string
  is_read: boolean
  created_at: string
  metadata?: NotificationMetadata
}

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

function playNotificationSound() {
  if (document.visibilityState !== 'visible') return
  const audio = new Audio('/sounds/notification.mp3')
  audio.volume = 0.5
  audio.play().catch(() => {})
}

export function NotificationBell({ locale }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const prevCountRef = useRef(0)

  const l = translations[locale]
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?unread_only=false')
      if (res.ok) {
        const data: Notification[] = await res.json()
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.is_read).length)
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

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

  // Начальная загрузка + polling каждые 30 сек
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Realtime subscription — мгновенные уведомления
  useEffect(() => {
    let userId: string | null = null

    supabase.auth.getUser().then(({ data }) => {
      userId = data?.user?.id ?? null
      if (!userId) return

      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification
            setNotifications(prev => [newNotif, ...prev])
            setUnreadCount(prev => prev + 1)

            playNotificationSound()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    })
  }, [])

  async function rejectInvitation(notifId: string, userId: string, orgId: string) {
    try {
      await fetch('/api/org/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userId, orgId }),
      })
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notifId] }),
      })
      setNotifications(prev => prev.filter(n => n.id !== notifId))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error(e)
    }
  }

  async function approveInvitation(notifId: string) {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notifId] }),
      })
      setNotifications(prev =>
        prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error(e)
    }
  }

  async function handleTransferAction(notifId: string, transferId: string, action: 'approved' | 'rejected') {
    try {
      const res = await fetch('/api/transfer-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transferId, status: action }),
      })
      if (!res.ok) {
        const e = await res.json()
        console.error(e.error)
        return
      }
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notifId] }),
      })
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error(e)
    }
  }

  function handleOpen() {
    setIsOpen(true)
    if (unreadCount > 0) markAllRead()
  }

  const notificationList = (
    <>
      {notifications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">{l.empty}</div>
      ) : (
        <div className="space-y-1 p-1">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`px-3 py-3 rounded-xl transition ${
                !n.is_read ? 'bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <a href={n.type === 'access_invitation' ? '#' : (n.link || '#')}>
                <div className="flex items-start gap-3">
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  )}
                  <div className={`flex-1 min-w-0 ${n.is_read ? 'ms-5' : ''}`}>
                    <p className={`text-sm ${!n.is_read ? 'font-semibold' : ''}`}>{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{n.body}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString(
                        locale === 'he' ? 'he-IL' : 'ru-RU',
                        { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
                      )}
                    </p>
                  </div>
                </div>
              </a>

              {/* Action buttons for transfer_request type */}
              {n.type === 'transfer_request' && n.metadata?.transfer_request_id && (
                <div className="mt-2 ms-5 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleTransferAction(n.id, n.metadata!.transfer_request_id!, 'approved')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-100 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    {locale === 'he' ? 'אשר' : 'Одобрить'}
                  </button>
                  <button
                    onClick={() => handleTransferAction(n.id, n.metadata!.transfer_request_id!, 'rejected')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    {locale === 'he' ? 'דחה' : 'Отклонить'}
                  </button>
                </div>
              )}

              {/* Action buttons for access_invitation type */}
              {n.type === 'access_invitation' && n.metadata && (
                <div className="mt-2 ms-5 flex flex-wrap gap-1.5">
                  {n.metadata.invited_by_phone && (
                    <>
                      <a
                        href={`tel:${n.metadata.invited_by_phone}`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        {locale === 'he' ? 'התקשר' : 'Позвонить'}
                      </a>
                      <a
                        href={`https://wa.me/${n.metadata.invited_by_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium hover:bg-green-100 transition-colors"
                      >
                        <MessageCircle className="w-3 h-3" />
                        WhatsApp
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => approveInvitation(n.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-100 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    {locale === 'he' ? 'אשר' : 'Одобрить'}
                  </button>
                  {n.metadata.invited_user_email && n.metadata.org_id && (
                    <button
                      onClick={() => rejectInvitation(n.id, n.metadata!.invited_user_email!, n.metadata!.org_id!)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      {locale === 'he' ? 'דחה' : 'Отклонить'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
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
          {notifications.length > 0 && (
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
