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
import { ToastStack } from '@/components/notifications/ToastStack'

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

// ── Single RT subscriptions for ALL tables ───────────────────────────────────
function GlobalRealtimeSync() {
  const { orgId, user } = useAuth()
  const { activeOrgId } = useBranch()
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const userId = user?.id ?? null

  const dispatch = (event: string, detail?: unknown) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(event, detail ? { detail } : undefined))
    }
  }

  useRealtimeSync({ table: 'products',  orgId: activeOrgId, queryKey: ['products'] })
  useRealtimeSync({ table: 'services',  orgId: orgId,       queryKey: ['services'] })
  useRealtimeSync({ table: 'sales',     orgId: activeOrgId, queryKey: ['sales'],
    onEvent: () => queryClient.invalidateQueries({ queryKey: ['payments-stats'], exact: false }) })
  useRealtimeSync({ table: 'payments',  orgId: activeOrgId, queryKey: ['payments'],
    onEvent: ({ eventType, new: row }) => {
      queryClient.invalidateQueries({ queryKey: ['payments-stats'], exact: false })
      if (eventType === 'INSERT') {
        const s = (row as any)?.status
        if (s === 'completed' || s === 'success') dispatch('trinity:new-payment')
      }
    }})
  useRealtimeSync({ table: 'expenses',  orgId: activeOrgId, queryKey: ['expenses'],
    onEvent: () => queryClient.invalidateQueries({ queryKey: ['expenses-stats'] }) })
  useRealtimeSync({ table: 'visits',    orgId: activeOrgId, queryKey: ['visits'],
    onEvent: ({ eventType, new: row }) => {
      if (eventType === 'INSERT') dispatch('trinity:new-visit')
      if (eventType === 'UPDATE' && (row as any)?.status === 'cancelled') dispatch('trinity:cancel-visit')
    }})
  useRealtimeSync({ table: 'clients',   orgId: orgId,       queryKey: ['clients'],
    onEvent: ({ eventType }) => {
      if (eventType === 'INSERT') dispatch('trinity:new-client')
    }})
  useRealtimeSync({ table: 'visit_services',        orgId: activeOrgId, queryKey: ['visit-services'] })
  useRealtimeSync({ table: 'inventory_transactions', orgId: activeOrgId, queryKey: ['inventory-transactions'] })

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

  useRealtimeSync({
    table: 'notifications', orgId: userId,
    queryKey: ['notifications'], events: ['INSERT'], filterColumn: 'user_id',
    onEvent: (payload: RealtimePayload) => dispatch('trinity:new-notification', payload.new),
  })

  return null
}

export function ClientProviders() {
  const pathname = usePathname()

  if (pathname === '/landing') return null

  return (
    <>
      <GlobalRealtimeSync />
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
