import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { PWAHomeRedirect } from '@/components/dashboard/PWAHomeRedirect'

// ─── DashboardPage ────────────────────────────────────────────────────────────
// Server Component — просто рендерит DashboardContent.
// Hydration mismatch (#418) подавляется через suppressHydrationWarning
// на корневом div внутри DashboardContent.
//
// PWAHomeRedirect — клиентский guard: если PWA открыта из иконки и у юзера
// выбрана другая landing page, редиректит на неё. На обычном вебе не работает.
export default function DashboardPage() {
  return (
    <>
      <PWAHomeRedirect />
      <DashboardContent orgId="" />
    </>
  )
}
