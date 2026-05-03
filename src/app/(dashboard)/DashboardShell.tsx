'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { BranchProvider } from '@/contexts/BranchContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { GlobalSearch } from '@/components/GlobalSearch'
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner'
import { PinnedModalsTray } from '@/components/ui/PinnedModalsTray'
import { RightPanel } from '@/components/layout/RightPanel'
import { DemoBannerGlobal } from '@/components/demo/DemoBannerGlobal'
import { DemoLimitGuardProvider } from '@/components/demo/DemoLimitGuard'
import { DemoLanguagePicker, useDemoLanguagePicker } from '@/components/demo/DemoLanguagePicker'
import { WaNotificationProvider } from '@/components/wa/WaNotificationProvider'
import { SiteOrdersRealtimeProvider } from '@/components/providers/SiteOrdersRealtimeProvider'
import { ClientProviders } from '@/components/providers/ClientProviders'
// LanguageProvider живёт в корневом layout.tsx (с initialLocale из БД).
// DashboardShell не дублирует его — useLanguage() работает через корневой контекст.
import { useLanguage } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { useHeartbeat } from '@/hooks/useHeartbeat'
import { useBranch } from '@/contexts/BranchContext'
import { useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'

// ─── Prefetch helpers ─────────────────────────────────────────────────────────
// Стратегия: adjacent prefetch при mount + hover prefetch при наведении.
// staleTime 30_000 — React Query не делает дубль-запросы.

type PrefetchTarget = 'visits' | 'sales' | 'payments' | 'expenses' | 'inventory' | 'diary' | 'analytics'

async function prefetchModule(qc: QueryClient, module: PrefetchTarget, orgId: string | undefined) {
  if (!orgId) return
  const STALE = 30_000
  try {
    switch (module) {
      case 'visits':
        await qc.prefetchQuery({
          queryKey: ['visits', orgId, { dateFilter: 'week', statusFilter: 'all', eventTypeFilter: 'all', search: '', page: 1, pageSize: 30 }],
          queryFn: () => fetch('/api/visits/list?dateFilter=week&statusFilter=all&eventTypeFilter=all&page=1&pageSize=30').then(r => r.json()),
          staleTime: STALE,
        })
        break
      case 'sales':
        await qc.prefetchQuery({
          queryKey: ['sales', orgId, null],
          queryFn: () => fetch('/api/sales', { headers: { 'X-Branch-Org-Id': orgId } }).then(r => r.json()),
          staleTime: STALE,
        })
        await qc.prefetchQuery({
          queryKey: ['sales-chart', orgId, undefined, undefined],
          queryFn: () => fetch('/api/sales?chart=1', { headers: { 'X-Branch-Org-Id': orgId } }).then(r => r.json()),
          staleTime: STALE,
        })
        break
      case 'payments':
        await qc.prefetchQuery({
          queryKey: ['payments', orgId, undefined, undefined],
          queryFn: () => fetch('/api/payments').then(r => r.json()),
          staleTime: STALE,
        })
        break
      case 'expenses':
        await qc.prefetchQuery({
          queryKey: ['expenses', undefined, undefined],
          queryFn: () => fetch('/api/expenses').then(r => r.json()).then(d => d.expenses ?? []),
          staleTime: STALE,
        })
        break
      case 'inventory':
        await qc.prefetchQuery({
          queryKey: ['products', orgId],
          queryFn: () => fetch('/api/products', { headers: { 'X-Branch-Org-Id': orgId } }).then(r => r.json()).then(d => d.products ?? []),
          staleTime: STALE,
        })
        break
      case 'diary':
        await qc.prefetchQuery({
          queryKey: ['tasks-diary'],
          queryFn: () => fetch('/api/tasks').then(r => r.json()),
          staleTime: STALE,
        })
        break
      case 'analytics':
        await qc.prefetchQuery({
          queryKey: ['analytics', orgId, 30],
          queryFn: async () => {
            const from = new Date(); from.setDate(from.getDate() - 30)
            const fromStr = from.toISOString().split('T')[0]
            const toStr   = new Date().toISOString().split('T')[0]
            const [sR, rR, vR, rpR] = await Promise.all([
              fetch(`/api/dashboard/stats?org_id=${orgId}`),
              fetch(`/api/dashboard/revenue?org_id=${orgId}&days=30`),
              fetch(`/api/dashboard/visits-chart?org_id=${orgId}&days=30`),
              fetch(`/api/dashboard/reports?org_id=${orgId}&from=${fromStr}T00:00:00Z&to=${toStr}T23:59:59Z`),
            ])
            return {
              stats:   sR.ok  ? await sR.json()  : null,
              revenue: rR.ok  ? await rR.json()  : [],
              visits:  vR.ok  ? await vR.json()  : [],
              reports: rpR.ok ? await rpR.json() : null,
            }
          },
          staleTime: STALE,
        })
        break
    }
  } catch { /* prefetch некритичен */ }
}

const ADJACENT_MAP: Record<string, PrefetchTarget[]> = {
  '/visits':    ['sales', 'payments'],
  '/sales':     ['visits', 'payments'],
  '/payments':  ['sales', 'expenses'],
  '/finances':  ['payments', 'inventory'],
  '/inventory': ['sales', 'expenses'],
  '/dashboard': ['visits', 'sales', 'diary'],
  '/clients':   ['visits', 'sales'],
  '/diary':     ['visits', 'analytics'],
  '/analytics': ['diary', 'visits'],
}

// ─── DashboardPrefetcher ──────────────────────────────────────────────────────
function DashboardPrefetcher() {
  const qc = useQueryClient()
  const { activeOrgId } = useBranch()
  const pathname = usePathname()
  const prefetchedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!activeOrgId) return
    const adjacent = ADJACENT_MAP[pathname] ?? []
    adjacent.forEach(module => {
      const key = `${module}:${activeOrgId}`
      if (!prefetchedRef.current.has(key)) {
        prefetchedRef.current.add(key)
        setTimeout(() => prefetchModule(qc, module, activeOrgId), 200)
      }
    })
  }, [pathname, activeOrgId, qc])

  return null
}

// ─── useHoverPrefetch — hover prefetch для nav-ссылок ────────────────────────
export function useHoverPrefetch(href: string) {
  const qc = useQueryClient()
  const { activeOrgId } = useBranch()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const moduleMap: Record<string, PrefetchTarget> = {
    '/visits':    'visits',
    '/sales':     'sales',
    '/payments':  'payments',
    '/finances':  'expenses',
    '/inventory': 'inventory',
    '/diary':     'diary',
    '/analytics': 'analytics',
  }

  const onMouseEnter = useCallback(() => {
    const module = Object.entries(moduleMap).find(([path]) => href.startsWith(path))?.[1]
    if (!module || !activeOrgId) return
    timerRef.current = setTimeout(() => prefetchModule(qc, module, activeOrgId), 150)
  }, [href, qc, activeOrgId])

  const onMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return { onMouseEnter, onMouseLeave }
}

// ─── DashboardInner ───────────────────────────────────────────────────────────
function DashboardInner({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage()
  const isRTL = language === 'he'
  const [searchOpen, setSearchOpen] = useState(false)
  const { show: showLangPicker, handleSelect: handleLangSelect } = useDemoLanguagePicker()
  useHeartbeat()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <WaNotificationProvider>
      <SiteOrdersRealtimeProvider />
      <DemoLimitGuardProvider>
        <DashboardPrefetcher />
        {showLangPicker && <DemoLanguagePicker onSelect={handleLangSelect}/>}
        <div className="min-h-[100dvh] bg-[#f8fafc] dark:bg-gray-950 flex flex-col">
          <ImpersonationBanner />
          <DemoBannerGlobal/>
          <MobileHeader onSearchOpen={() => setSearchOpen(true)} />
          <div className="flex-1 lg:flex lg:h-screen lg:overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
            <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0 sticky top-0 h-screen overflow-y-auto z-[0]">
              <Sidebar onSearchOpen={() => setSearchOpen(true)} />
            </aside>
            <main id="main-scroll" className="flex-1 lg:overflow-y-auto lg:h-screen bg-[#f8fafc] dark:bg-gray-950">
              <div className="p-4 lg:p-6" style={{ direction: 'ltr' }}>
                <ErrorBoundary>{children}</ErrorBoundary>
              </div>
            </main>
            <RightPanel />
          </div>
        </div>
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
        <PinnedModalsTray />
        <ClientProviders />
      </DemoLimitGuardProvider>
    </WaNotificationProvider>
  )
}

// ─── DashboardShell — публичный экспорт ──────────────────────────────────────
// LanguageProvider намеренно отсутствует: он живёт в корневом layout.tsx
// и получает initialLocale из БД через getUserPreferences().
// Дублировать его здесь означало бы создать вложенный контекст без initialLocale,
// что могло вызвать флаш языка при несовпадении localStorage и БД.
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <BranchProvider>
      <ThemeProvider>
        <DashboardInner>
          {children}
        </DashboardInner>
      </ThemeProvider>
    </BranchProvider>
  )
}
