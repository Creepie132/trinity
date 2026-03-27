'use client'

/**
 * DemoLimitGuard — глобальный перехватчик HTTP 403 LIMIT_EXCEEDED.
 *
 * Архитектура:
 *  - Context хранит состояние открытой модалки (entity + open)
 *  - useDemoLimitGuard() — хук для ручного открытия из любого компонента
 *  - GlobalMutationErrorHandler встраивается в QueryClient onError и
 *    автоматически перехватывает все мутации с кодом LIMIT_EXCEEDED
 *
 * Подключение (в DashboardShell / layout):
 *   <DemoLimitGuardProvider>
 *     {children}
 *   </DemoLimitGuardProvider>
 *
 * Использование в мутациях (автоматически через QueryClient):
 *   Никакого дополнительного кода не нужно — перехватчик глобальный.
 *
 * Ручное открытие (если нужно вне мутаций):
 *   const { openLimitModal } = useDemoLimitGuard()
 *   openLimitModal('clients')
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DemoLimitModal } from '@/components/demo/DemoLimitModal'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalSection = 'clients' | 'visits' | 'inventory' | 'diary'

/** Maps API entity → DemoLimitModal section prop */
const ENTITY_TO_SECTION: Record<string, ModalSection> = {
  clients:  'clients',
  visits:   'visits',
  products: 'inventory',
  tasks:    'diary',
}

interface DemoLimitGuardContextType {
  /** Programmatically open the limit modal for a specific section */
  openLimitModal: (section: ModalSection) => void
}

const DemoLimitGuardContext = createContext<DemoLimitGuardContextType | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DemoLimitGuardProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<ModalSection>('visits')

  const openLimitModal = useCallback((s: ModalSection) => {
    setSection(s)
    setOpen(true)
  }, [])

  // Install global fetch interceptor for 403 LIMIT_EXCEEDED responses.
  // Wraps window.fetch so ALL HTTP calls (fetch, React Query, manual) are covered.
  useEffect(() => {
    const originalFetch = window.fetch

    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      // Only intercept 403 responses
      if (response.status === 403) {
        try {
          // Clone before reading — body can only be consumed once
          const cloned = response.clone()
          const json = await cloned.json().catch(() => null)

          if (json?.code === 'LIMIT_EXCEEDED') {
            const entity = json.entity as string
            const modalSection: ModalSection =
              ENTITY_TO_SECTION[entity] ?? 'visits'

            // Defer to next tick so component state update is not inside fetch
            setTimeout(() => openLimitModal(modalSection), 0)
          }
        } catch {
          // JSON parse failed — not our error, pass through
        }
      }

      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [openLimitModal])

  return (
    <DemoLimitGuardContext.Provider value={{ openLimitModal }}>
      {children}
      <DemoLimitModal
        open={open}
        onClose={() => setOpen(false)}
        section={section}
      />
    </DemoLimitGuardContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDemoLimitGuard(): DemoLimitGuardContextType {
  const ctx = useContext(DemoLimitGuardContext)
  if (!ctx) throw new Error('useDemoLimitGuard must be used inside <DemoLimitGuardProvider>')
  return ctx
}

/** Safe version — returns null outside provider (e.g., in worker shell) */
export function useDemoLimitGuardSafe(): DemoLimitGuardContextType | null {
  return useContext(DemoLimitGuardContext)
}
