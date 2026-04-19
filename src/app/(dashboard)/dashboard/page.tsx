import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { PWAHomeGate } from '@/components/dashboard/PWAHomeGate'

// ─── DashboardPage ────────────────────────────────────────────────────────────
// Server Component — рендерит DashboardContent внутри PWAHomeGate.
//
// PWAHomeGate решает синхронно (при первом рендере), нужно ли редиректить
// пользователя на его выбранную landing page. Если да — дашборд НЕ монтируется
// вообще (ни виджетов, ни fetch'ей), показывается пустой фон и сразу
// триггерится router.replace. Это устраняет мелькание дашборда на 4-5 секунд
// перед переходом на целевую страницу.
//
// На обычном вебе (не PWA standalone) гейт сразу рендерит детей — никаких
// задержек и никакого влияния на обычных пользователей.
export default function DashboardPage() {
  return (
    <PWAHomeGate>
      <DashboardContent orgId="" />
    </PWAHomeGate>
  )
}
