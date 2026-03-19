'use client'

/**
 * ClientProviders — lazy-load non-critical UI widgets.
 * Вынесено в отдельный Client Component, чтобы использовать dynamic() с ssr:false
 * без конфликта с серверным layout.tsx.
 *
 * Эти компоненты грузятся ПОСЛЕ первого рендера — не блокируют LCP.
 * На /landing — не рендерим ничего (landing изолирован, ModalManager не нужен).
 */
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

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

export function ClientProviders() {
  const pathname = usePathname()

  // Landing страница изолирована — не подключаем CRM-виджеты
  if (pathname === '/landing') return null

  return (
    <>
      <UpdateBanner />
      <ForceLightMode />
      <ModalManager />
      <PWAInstallBanner />
      <PushNotificationPrompt />
      <ConditionalChatWidget />
    </>
  )
}
