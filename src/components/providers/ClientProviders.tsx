'use client'

/**
 * ClientProviders — lazy-load non-critical UI widgets.
 * Вынесено в отдельный Client Component, чтобы использовать dynamic() с ssr:false
 * без конфликта с серверным layout.tsx.
 *
 * Эти компоненты грузятся ПОСЛЕ первого рендера — не блокируют LCP.
 */
import dynamic from 'next/dynamic'

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

const ForceLightMode = dynamic(
  () => import('@/components/ForceLightMode').then(m => ({ default: m.ForceLightMode })),
  { ssr: false }
)

export function ClientProviders() {
  return (
    <>
      <ForceLightMode />
      <ModalManager />
      <PWAInstallBanner />
      <ConditionalChatWidget />
    </>
  )
}
