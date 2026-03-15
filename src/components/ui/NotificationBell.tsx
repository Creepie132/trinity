'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Bell, CheckCheck, Phone, MessageCircle, Check, X } from 'lucide-react'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawerLazy'
import { TrinityNotificationIcon } from './TrinityNotificationIcon'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface NotificationMetadata {
  invited_user_email?: string
  invited_user_id?: string
  org_id?: string
  org_name?: string
  invited_by_email?: string
  invited_by_phone?: string
  // access_request
  staff_email?: string
  staff_user_id?: string
  staff_name?: string
  staff_phone?: string
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
  const bellRef = useRef<HTMLDivElement | null>(null)

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

  async function approveAccessRequest(notifId: string) {
    try {
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

  async function rejectAccessRequest(notifId: string, staffEmail: string, orgId: string) {
    try {
      await fetch('/api/org/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staffEmail, orgId }),
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

  function handleOpen() {
    setIsOpen(true)
    if (unreadCount > 0) markAllRead()
  }

  const notificationList = (
    <>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center py-12 gap-3 text-gray-400">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
            <Bell className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm">{l.empty}</p>
        </div>
      ) : (
        <div className="space-y-1.5 p-1">
          {notifications.map((n) => {
            const typeIcon: Record<string, string> = {
              access_invitation: '👥',
              access_request: '🔑',
              transfer_request: '📦',
              transfer_result: '✅',
              payment: '💳',
              visit: '📅',
              task: '✅',
              system: 'ℹ️',
            }
            const icon = typeIcon[n.type] || '🔔'

            return (
              <div key={n.id}
                className={`rounded-xl border p-3 transition-all ${
                  !n.is_read
                    ? 'bg-indigo-50/60 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30'
                    : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <a href={n.type === 'access_invitation' ? '#' : (n.link || '#')}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${
                      !n.is_read ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.created_at).toLocaleString(
                          locale === 'he' ? 'he-IL' : 'ru-RU',
                          { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
                        )}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1 flex-shrink-0" />
                    )}
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

              {/* Action buttons for access_request type (owner receives when staff joins) */}
              {n.type === 'access_request' && n.metadata && (
                <div className="mt-2 ms-5 flex flex-wrap gap-1.5">
                  {n.metadata.staff_phone && (
                    <>
                      <a
                        href={`tel:${n.metadata.staff_phone}`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        {locale === 'he' ? '📞 התקשר' : '📞 Позвонить'}
                      </a>
                      <a
                        href={`https://wa.me/${n.metadata.staff_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium hover:bg-green-100 transition-colors"
                      >
                        <MessageCircle className="w-3 h-3" />
                        💬 WhatsApp
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => approveAccessRequest(n.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-100 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    {locale === 'he' ? '✅ אשר' : '✅ Одобрить'}
                  </button>
                  {n.metadata.staff_email && n.metadata.org_id && (
                    <button
                      onClick={() => rejectAccessRequest(n.id, n.metadata!.staff_email!, n.metadata!.org_id!)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      {locale === 'he' ? '❌ דחה' : '❌ Отклонить'}
                    </button>
                  )}
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
            )
          })}
        </div>
      )}
    </>
  )

  return (
    <>
      <div className="relative" ref={bellRef}>
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

        {/* Desktop — dropdown popup через portal (выходит за пределы aside/overflow контейнеров) */}
        {!isMobile && isOpen && typeof document !== 'undefined' && createPortal(
          <>
            {/* Backdrop для закрытия по клику вне */}
            <div
              className="fixed inset-0"
              style={{ zIndex: 9998 }}
              onClick={() => setIsOpen(false)}
            />
            {/* Сам dropdown */}
            <div
              className="fixed bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 flex flex-col overflow-hidden"
              style={{
                zIndex: 9999,
                width: '420px',
                maxHeight: '80vh',
                top: (() => {
                  if (!bellRef.current) return '70px'
                  const r = bellRef.current.getBoundingClientRect()
                  return `${r.bottom + 8}px`
                })(),
                left: (() => {
                  if (!bellRef.current) return '20px'
                  const r = bellRef.current.getBoundingClientRect()
                  const left = Math.min(r.left, window.innerWidth - 428)
                  return `${Math.max(8, left)}px`
                })(),
              }}
            >
              {/* Заголовок */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-500" />
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{l.title}</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-indigo-500 text-white rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Список уведомлений — скроллится */}
              <div className="flex-1 overflow-y-auto p-3">
                {notificationList}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    {l.markRead}
                  </button>
                </div>
              )}
            </div>
          </>,
          document.body
        )}
      </div>
    </>
  )
}
