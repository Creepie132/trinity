import { DashboardContent } from '@/components/dashboard/DashboardContent'

// ─── DashboardPage ────────────────────────────────────────────────────────────
// ⚡ Синхронный Server Component — рендерится МГНОВЕННО, без await.
// Auth-редирект обеспечивается layout.tsx + RLS на API routes.
// Данные загружаются на клиенте через React Query (staleTime + DashboardPrefetcher).
// Редирект sales_agent → /worker перенесён в DashboardContent (useEffect).
export default function DashboardPage() {
  return <DashboardContent orgId="" />
}
