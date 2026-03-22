'use client'

/**
 * DemoContext — изолированный контекст для интерактивного demo-режима.
 * НЕ конфликтует с useDemoMode (триал-план) — это отдельная система.
 *
 * Архитектура:
 * - Отдельный QueryClient с pre-filled кэшем → нулевые запросы к Supabase
 * - DEMO_ORG_ID изолирует данные на случай пробоя
 * - checkBlocked() блокирует деструктивные действия через sonner toast
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  DEMO_ORG_ID,
  MOCK_DASHBOARD_STATS,
  MOCK_REVENUE_CHART,
  MOCK_VISITS,
  MOCK_ORGANIZATION,
  MOCK_CLIENTS,
} from '@/lib/demo/mockData'

// ─── Список заблокированных действий ─────────────────────────────────────────
const BLOCKED_ACTIONS = [
  'delete-employee',
  'change-admin-password',
  'delete-organization',
  'export-data',
  'billing-change',
  'send-sms',
  'send-whatsapp',
] as const

export type BlockedAction = typeof BLOCKED_ACTIONS[number]

// ─── Типы ─────────────────────────────────────────────────────────────────────
interface DemoContextType {
  isDemoMode: true
  demoOrgId: string
  isTourActive: boolean
  tourStep: number
  startTour: () => void
  nextTourStep: () => void
  endTour: () => void
  /** Проверить блокировку. Возвращает true и показывает toast если заблокировано. */
  checkBlocked: (action: BlockedAction) => boolean
}

const DemoContext = createContext<DemoContextType | undefined>(undefined)

// ─── QueryClient с pre-filled mock-кэшем ────────────────────────────────────
function createDemoQueryClient(): QueryClient {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,   // никогда не перефетчивать
        gcTime: Infinity,      // не выбрасывать из кэша
        retry: false,          // не пытаться идти в сеть
      },
    },
  })

  // Наполняем кэш — компоненты получат данные мгновенно без fetch
  qc.setQueryData(['dashboard-stats',   DEMO_ORG_ID], MOCK_DASHBOARD_STATS)
  qc.setQueryData(['dashboard-today',   DEMO_ORG_ID], MOCK_VISITS.filter(v => v.status === 'scheduled'))
  qc.setQueryData(['dashboard-revenue', DEMO_ORG_ID], MOCK_REVENUE_CHART)
  qc.setQueryData(['organization',      DEMO_ORG_ID], MOCK_ORGANIZATION)
  qc.setQueryData(['clients',           DEMO_ORG_ID], { data: MOCK_CLIENTS, count: MOCK_CLIENTS.length })
  qc.setQueryData(['is-admin'],         false)

  return qc
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function DemoProvider({ children }: { children: ReactNode }) {
  const [isTourActive, setTourActive] = useState(false)
  const [tourStep, setTourStep]       = useState(1)

  // Стабильная ссылка — не пересоздаём при ре-рендерах
  const demoQcRef = useRef<QueryClient | null>(null)
  if (!demoQcRef.current) {
    demoQcRef.current = createDemoQueryClient()
  }

  const startTour    = useCallback(() => { setTourStep(1); setTourActive(true) },  [])
  const nextTourStep = useCallback(() => setTourStep(s => Math.min(s + 1, 5)),     [])
  const endTour      = useCallback(() => { setTourActive(false); setTourStep(1) }, [])

  const checkBlocked = useCallback((action: BlockedAction): boolean => {
    const isBlocked = (BLOCKED_ACTIONS as readonly string[]).includes(action)
    if (isBlocked) {
      toast.warning('В демо-версии эта функция ограничена', {
        description: 'Получите полный доступ — свяжитесь с нами.',
        action: {
          label: '💬 Хочу такую систему',
          onClick: () => window.open('https://wa.me/972544858586', '_blank'),
        },
        duration: 5000,
      })
    }
    return isBlocked
  }, [])

  const value: DemoContextType = {
    isDemoMode: true,
    demoOrgId: DEMO_ORG_ID,
    isTourActive,
    tourStep,
    startTour,
    nextTourStep,
    endTour,
    checkBlocked,
  }

  return (
    <DemoContext.Provider value={value}>
      <QueryClientProvider client={demoQcRef.current}>
        {children}
      </QueryClientProvider>
    </DemoContext.Provider>
  )
}

// ─── Хуки ─────────────────────────────────────────────────────────────────────
export function useDemoContext(): DemoContextType {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemoContext must be used inside <DemoProvider>')
  return ctx
}

/**
 * Безопасная версия — не бросает ошибку вне DemoProvider.
 * Используй в компонентах, которые работают и в demo, и в prod.
 */
export function useDemoContextSafe(): DemoContextType | null {
  return useContext(DemoContext) ?? null
}
