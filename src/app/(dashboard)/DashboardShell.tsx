'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { AuthProvider } from '@/contexts/AuthContext'
import { BranchProvider } from '@/contexts/BranchContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { GlobalSearch } from '@/components/GlobalSearch'
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner'
import { PinnedModalsTray } from '@/components/ui/PinnedModalsTray'
import { RightPanel } from '@/components/layout/RightPanel'
import { DemoBannerGlobal } from '@/components/demo/DemoBannerGlobal'
import { DemoLanguagePicker, useDemoLanguagePicker } from '@/components/demo/DemoLanguagePicker'
import { WaNotificationProvider } from '@/components/wa/WaNotificationProvider'
import { ClientProviders } from '@/components/providers/ClientProviders'
import { LanguageProvider } from '@/contexts/LanguageContext'

export function DashboardShell({
  children,
  workerMode = false,
}: {
  children: React.ReactNode
  workerMode?: boolean
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const { show: showLangPicker, handleSelect: handleLangSelect } = useDemoLanguagePicker()

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

  // Кабинет продажника — layout без основного Sidebar и MobileHeader.
  // Собственный Sidebar воркера рендерится внутри (workspace)/layout.tsx
  if (workerMode) {
    return (
      <AuthProvider>
        <LanguageProvider>
          <div className="min-h-[100dvh]">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </LanguageProvider>
      </AuthProvider>
    )
  }

  return (
    <AuthProvider>
      <BranchProvider>
        <WaNotificationProvider>
        {showLangPicker && <DemoLanguagePicker onSelect={handleLangSelect}/>}

        <div className="min-h-[100dvh] bg-[#f8fafc] dark:bg-gray-950 flex flex-col">
          <DemoBannerGlobal/>
          <MobileHeader onSearchOpen={() => setSearchOpen(true)} />
          <div className="flex-1 lg:flex lg:h-screen lg:overflow-hidden">
            <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0 sticky top-0 h-screen overflow-y-auto z-[0]">
              <Sidebar onSearchOpen={() => setSearchOpen(true)} />
            </aside>
            <main id="main-scroll" className="flex-1 lg:overflow-y-auto lg:h-screen bg-[#f8fafc] dark:bg-gray-950">
              <div className="p-4 lg:p-6">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </div>
            </main>
            <RightPanel />
          </div>
        </div>
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
        <ImpersonationBanner />
        <PinnedModalsTray />
        <ClientProviders />
        </WaNotificationProvider>
      </BranchProvider>
    </AuthProvider>
  )
}
