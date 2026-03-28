'use client'

/**
 * WorkerShellWrapper — тонкий клиентский мост между Server Layout и WorkerShell.
 *
 * Зачем: WorkerShell — Client Component с useState/useEffect,
 * но лежит в DashboardShell.tsx (тоже клиентский).
 * Чтобы не дублировать огромный компонент, импортируем WorkerShell напрямую
 * через re-export отдельного модуля.
 *
 * Провайдеры: BranchProvider, LanguageProvider, ThemeProvider, ClientProviders
 * уже внутри WorkerShell (через DashboardShell workerMode=true).
 */

import { BranchProvider } from '@/contexts/BranchContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ClientProviders } from '@/components/providers/ClientProviders'
import { WorkerShellInner } from './WorkerShellInner'

export function WorkerShellWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BranchProvider>
      <LanguageProvider>
        <ThemeProvider>
          <WorkerShellInner>
            {children}
          </WorkerShellInner>
        </ThemeProvider>
        <ClientProviders />
      </LanguageProvider>
    </BranchProvider>
  )
}
