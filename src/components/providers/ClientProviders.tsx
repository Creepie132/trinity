'use client'

/**
 * ClientProviders — lazy-load non-critical UI widgets.
 * Also hosts the SINGLE centralised Supabase Realtime subscriptions
 * for tables that are used by multiple hooks simultaneously.
 *
 * ⚠️ ANTI-PATTERN PREVENTION:
 * useProducts(), useServices() are called from 8+ components at once.
 * Each call used to create its own RT channel → Supabase "mismatch between
 * server and client bindings" error. Fix: remove RT from those hooks,
 * subscribe ONCE here instead.
 */
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'

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

// ── Single RT subscriptions for shared tables ─────────────────────────────────
function GlobalRealtimeSync() {
  const { orgId } = useAuth()
  const { activeOrgId } = useBranch()

  // products — used by SaleModal, VisitDetailMob, InventoryPage, DashboardContent, etc.
  useRealtimeSync({ table: 'products',  orgId: activeOrgId, queryKey: ['products']  })
  // services — used by CreateVisitDialog, SaleModal, VisitDetailMob, settings, etc.
  useRealtimeSync({ table: 'services',  orgId: orgId,       queryKey: ['services']  })

  return null
}

export function ClientProviders() {
  const pathname = usePathname()

  // Landing страница изолирована — не подключаем CRM-виджеты
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
    </>
  )
}
