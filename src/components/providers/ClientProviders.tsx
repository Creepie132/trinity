'use client'

/**
 * ClientProviders — lazy-load non-critical UI widgets.
 * Also hosts the SINGLE centralised Supabase Realtime subscriptions
 * for tables that are used by multiple hooks simultaneously.
 *
 * ⚠️ ANTI-PATTERN PREVENTION:
 * useProducts(), useServices(), useOrganization() are called from many
 * components at once. Each call used to create its own RT channel →
 * Supabase "cannot add postgres_changes callbacks after subscribe()" error.
 *
 * NotificationBell renders in BOTH Sidebar (desktop) AND MobileHeader (mobile)
 * simultaneously → same channel name → same error. Fix: centralise here.
 *
 * Rule: ONE channel per (table, id) per browser session — always here.
 */
import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useRealtimeSync, RealtimePayload } from '@/hooks/useRealtimeSync'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'
import { GlobalRealtimeProvider } from '@/components/providers/GlobalRealtimeProvider'
import { ToastStack } from '@/components/notifications/ToastStack'
import { useNotificationStore } from '@/components/notifications/NotificationStore'
import { playNotificationSound } from '@/components/notifications/SoundManager'
import type { ToastVariant, ToastPriority } from '@/components/notifications/types'

const ConditionalChatWidget = dynamic(
  () => import('@/components/ConditionalChatWidget'),
  { ssr: false }
)

const ModalManager = dynamic(
  () => import('@/components/modals/ModalManager').then(m => ({ default: m.ModalManager })),
  { ssr: false }
)

const PWAInstallBanner = dynamic(
  () => import('@/components/PWAInstallBanner').then(m => ({ default: m.PWAInstallBanner })),
  { ssr: false }
)

const PushNotificationPrompt = dynamic(
  () => import('@/components/PushNotificationPrompt').then(m => ({ default: m.PushNotificationPrompt })),
  { ssr: false }
)

const ForceLightMode = dynamic(
  () => import('@/components/ForceLightMode').then(m => ({ default: m.ForceLightMode })),
  { ssr: false }
)

const UpdateBanner = dynamic(
  () => import('@/components/UpdateBanner').then(m => ({ default: m.UpdateBanner })),
  { ssr: false }
)

// ── Maps DB notification type → toast variant ─────────────────────────────────
function notifTypeToVariant(type: string, priority?: string): ToastVariant {
  if (priority === 'urgent') return 'critical'
  const map: Record<string, ToastVariant> = {
    payment:            'payment',
    subscription_payment: 'payment',
    client_registered:  'client',
    visit:              'visit',
    task:               'task',
    task_assigned:      'task',
    mention:            'info',
    access_invitation:  'info',
    access_request:     'info',
    transfer_request:   'info',
    transfer_result:    'success',
    new_order:          'payment',
    demo_order_submitted: 'payment',
    system:             'system',
    error:              'error',
  }
  return map[type] ?? 'info'
}

function notifTypeToPriority(type: string, dbPriority?: string): ToastPriority {
  if (dbPriority === 'urgent') return 'urgent'
  if (dbPriority === 'high')   return 'high'
  const highTypes = ['payment', 'subscription_payment', 'new_order', 'access_request', 'transfer_request']
  return highTypes.includes(type) ? 'high' : 'normal'
}

// ── Realtime: surgical cache updates for all standard tables ─────────────────
// GlobalRealtimeProvider replaces the old pattern of N useRealtimeSync() calls
// (which each did invalidateQueries → full refetch).
// It does setQueriesData surgery: INSERT/UPDATE/DELETE without a network hit.
// Only notifications (filterColumn=user_id) remain as a separate useRealtimeSync.
function GlobalRealtimeSyncBridge() {
  const { orgId, user } = useAuth()
  const { activeOrgId } = useBranch()
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const userId = user?.id ?? null

  // ── organizations: module-flag redirect on UPDATE ─────────────────────────
  // Not in GlobalRealtimeProvider because it needs router + pathname side-effects
  useRealtimeSync({
    table: 'organizations', orgId: activeOrgId,
    queryKey: ['organization'], events: ['UPDATE'], filterColumn: 'id',
    onEvent: (payload: RealtimePayload) => {
      queryClient.invalidateQueries({ queryKey: ['organization'] })
      const mods = (payload.new as any)?.features?.modules || {}
      const routes: Record<string, string> = {
        '/payments': 'payments', '/inventory': 'inventory', '/sms': 'sms',
        '/stats': 'statistics', '/reports': 'reports',
        '/subscriptions': 'subscriptions', '/booking': 'booking',
      }
      for (const [route, key] of Object.entries(routes)) {
        if (pathname.startsWith(route) && !mods[key]) { router.push('/dashboard'); break }
      }
    },
  })

  // ── notifications: user_id filter (non-standard, stays as useRealtimeSync) ─
  function showNotifToast(notif: any) {
    const variant  = notifTypeToVariant(notif.type, notif.priority)
    const priority = notifTypeToPriority(notif.type, notif.priority)
    const duration = priority === 'urgent' ? 0 : priority === 'high' ? 8000 : 5000
    useNotificationStore.getState().show({
      title:       notif.title ?? '—',
      description: notif.body  ?? undefined,
      variant, priority, duration,
      sound: false,
    })
    playNotificationSound(variant, priority)
  }

  useRealtimeSync({
    table: 'notifications', orgId: userId,
    queryKey: ['notifications'], events: ['INSERT'], filterColumn: 'user_id',
    onEvent: (payload: RealtimePayload) => {
      const notif = payload.new as any
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trinity:new-notification', { detail: notif }))
      }
      showNotifToast(notif)
    },
  })

  // ── All other tables: handled by GlobalRealtimeProvider (surgical updates) ─
  return (
    <GlobalRealtimeProvider
      activeOrgId={activeOrgId}
      mainOrgId={orgId}
    />
  )
}

export function ClientProviders() {
  const pathname = usePathname()

  if (pathname === '/landing') return null

  return (
    <>
      <GlobalRealtimeSyncBridge />
      <UpdateBanner />
      <ForceLightMode />
      <ModalManager />
      <PWAInstallBanner />
      <PushNotificationPrompt />
      <ConditionalChatWidget />
      {/* ── Trinity Toast Notification Stack ─────────────────────── */}
      <ToastStack />
    </>
  )
}
