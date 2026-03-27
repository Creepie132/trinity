'use client'

/**
 * DemoLimitGuard — глобальный перехватчик HTTP 403 LIMIT_EXCEEDED.
 *
 * Архитектура:
 *  - Context хранит состояние открытой модалки (entity + open)
 *  - useDemoLimitGuard() — хук для ручного открытия из любого компонента
 *  - Перехват через React Query MutationCache onError — нативный, безопасный,
 *    не трогает window.fetch, не конфликтует с Next.js App Router
 *
 * Подключение: QueryProvider создаёт MutationCache с onError → вызывает
 *   openDemoLimitModal из DemoLimitGuardContext.
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
  ReactNode,
} from 'react'
import { DemoLimitModal } from '@/components/demo/DemoLimitModal'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModalSection = 'clients' | 'visits' | 'inventory' | 'diary'

/** Maps API entity → DemoLimitModal section prop */
export const ENTITY_TO_SECTION: Record<string, ModalSection> = {
  clients:  'clients',
  visits:   'visits',
  products: 'inventory',
  tasks:    'diary',
}

interface DemoLimitGuardContextType {
  openLimitModal: (section: ModalSection) => void
}

export const DemoLimitGuardContext =
  createContext<DemoLimitGuardContextType | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DemoLimitGuardProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<ModalSection>('visits')

  const openLimitModal = useCallback((s: ModalSection) => {
    setSection(s)
    setOpen(true)
  }, [])

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

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDemoLimitGuard(): DemoLimitGuardContextType {
  const ctx = useContext(DemoLimitGuardContext)
  if (!ctx) throw new Error('useDemoLimitGuard must be used inside <DemoLimitGuardProvider>')
  return ctx
}

export function useDemoLimitGuardSafe(): DemoLimitGuardContextType | null {
  return useContext(DemoLimitGuardContext)
}
