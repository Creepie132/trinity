import { DashboardContent } from '@/components/dashboard/DashboardContent'

// ─── DashboardPage ────────────────────────────────────────────────────────────
// Server Component — просто рендерит DashboardContent.
// Hydration mismatch (#418) подавляется через suppressHydrationWarning
// на корневом div внутри DashboardContent.
export default function DashboardPage() {
  return <DashboardContent orgId="" />
}
