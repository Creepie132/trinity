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
 * Fix: remove RT from those hooks, subscribe ONCE here instead.
 */
import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useRealtimeSync, RealtimePayload } from '@/hooks/useRealtimeSync'
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
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()

  // products — used by SaleModal, VisitDetailMob, InventoryPage, DashboardContent, etc.
  useRealtimeSync({ table: 'products',  orgId: activeOrgId, queryKey: ['products']  })
  // services — used by CreateVisitDialog, SaleModal, VisitDetailMob, settings, etc.
  useRealtimeSync({ table: 'services',  orgId: orgId,       queryKey: ['services']  })

  // organizations — useOrganization() is called from 15+ components simultaneously.
  // Centralised here to prevent "cannot add postgres_changes after subscribe()" error.
  useRealtimeSync({
    table: 'organizations',
    orgId: activeOrgId,
    queryKey: ['organization'],
    events: ['UPDATE'],
    filterColumn: 'id',   // organizations table uses id, not org_id
    onEvent: (payload: RealtimePayload) => {
      // Invalidate all org-related queries
      queryClient.invalidateQueries({ queryKey: ['organization'] })

      // Redirect if the currently-viewed module was disabled remotely
      const newModules = (payload.new as any)?.features?.modules || {}
      const moduleRoutes: Record<string, string> = {
        '/payments':      'payments',
        '/inventory':     'inventory',
        '/sms':           'sms',
        '/stats':         'statistics',
        '/reports':       'reports',
        '/subscriptions': 'subscriptions',
        '/booking':       'booking',
      }
      for (const [route, moduleKey] of Object.entries(moduleRoutes)) {
        if (pathname.startsWith(route) && !newModules[moduleKey]) {
          router.push('/dashboard')
          break
        }
      }
    },
  })

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
