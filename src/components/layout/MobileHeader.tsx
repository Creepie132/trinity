'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Menu, ArrowLeft, Building2, ChevronDown, Check } from 'lucide-react'
import { MobileSidebar } from './MobileSidebar'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { useLanguage } from '@/contexts/LanguageContext'
import { useBranch } from '@/contexts/BranchContext'
import { useOrganization } from '@/hooks/useOrganization'
import { useBackNavigation } from '@/hooks/useBackNavigation'
import { useLandingPage } from '@/hooks/useLandingPage'
import { cn } from '@/lib/utils'

interface MobileHeaderProps {
  onSearchOpen?: () => void
}

export function MobileHeader({ onSearchOpen }: MobileHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [branchOpen, setBranchOpen] = useState(false)
  const branchRef = useRef<HTMLDivElement>(null)
  const { language } = useLanguage()
  const { activeOrgId, mainOrgId, branches, switchBranch, isMainOrg, currentBranchName } = useBranch()
  const { data: mainOrg } = useOrganization()
  const { handleBack, canGoBack } = useBackNavigation()
  const { landingPath } = useLandingPage()

  const hasBranches = branches && branches.length > 0

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) {
        setBranchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeBranchLabel = isMainOrg
    ? (mainOrg?.name || (language === 'he' ? 'ראשי' : 'Главная'))
    : currentBranchName || (language === 'he' ? 'סניף' : 'Филиал')

  return (
    <>
      {/* Мобильный header — только на <1024px */}
      <header className="lg:hidden sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border-b border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between w-full px-4 h-16">

          {/* ── Start: кнопка «Назад» (условная) ── */}
          {/* При LTR (ru) — физически слева. При RTL (he) — Flexbox зеркалит вправо. */}
          <div className="w-10 flex items-center justify-start">
            {canGoBack ? (
              <button
                onClick={handleBack}
                className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 active:bg-gray-200 dark:active:bg-slate-600 transition-all duration-200 active:scale-95 group"
                aria-label={language === 'he' ? 'חזור' : 'Назад'}
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </button>
            ) : (
              /* Пустой placeholder — сохраняет симметрию для justify-between */
              <span className="w-10" aria-hidden="true" />
            )}
          </div>

          {/* ── Center: Логотип или Branch Switcher ── */}
          {hasBranches ? (
            <div ref={branchRef} className="relative">
              <button
                onClick={() => setBranchOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 active:scale-95 transition-all duration-200"
              >
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300 max-w-[120px] truncate">
                  {activeBranchLabel}
                </span>
                <ChevronDown className={cn(
                  'w-3.5 h-3.5 text-blue-500 transition-transform duration-200 flex-shrink-0',
                  branchOpen && 'rotate-180'
                )} />
              </button>

              {branchOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                  {/* Main org */}
                  <button
                    onClick={() => {
                      if (mainOrgId) switchBranch(mainOrgId)
                      setBranchOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-start',
                      isMainOrg && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {mainOrg?.name?.[0]?.toUpperCase() || 'M'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {mainOrg?.name || (language === 'he' ? 'ראשי' : 'Главная')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {language === 'he' ? 'ראשי' : 'Главная'}
                      </p>
                    </div>
                    {isMainOrg && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                  </button>

                  {/* Branch options */}
                  {branches.map((branch) => {
                    const isActive = activeOrgId === branch.child_org_id
                    return (
                      <button
                        key={branch.id}
                        onClick={() => {
                          switchBranch(branch.child_org_id)
                          setBranchOpen(false)
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-start border-t border-gray-100 dark:border-slate-700',
                          isActive && 'bg-blue-50 dark:bg-blue-900/20'
                        )}
                      >
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {branch.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {branch.name}
                          </p>
                          {branch.address && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {branch.address}
                            </p>
                          )}
                        </div>
                        {isActive && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <Link
              href={landingPath}
              prefetch={true}
              className="flex items-center gap-2.5 rounded-lg px-1 py-0.5 active:scale-95 transition-transform"
              aria-label={language === 'he' ? 'מעבר לדף הבית' : 'Перейти на главную'}
            >
              <img src="/logo.png" alt="Amber Solutions" className="w-9 h-9 object-contain rounded-lg" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
                Trinity
              </h1>
            </Link>
          )}

          {/* ── End: Уведомления + Бургер ── */}
          {/* При LTR — физически справа. При RTL — Flexbox зеркалит влево. */}
          <div className="flex items-center gap-1">
            <NotificationBell locale={language === 'he' ? 'he' : 'ru'} />
            <button
              onClick={() => setIsOpen(true)}
              className="p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-700 active:bg-blue-100 dark:active:bg-slate-600 transition-all duration-200 active:scale-95"
              aria-label={language === 'he' ? 'פתח תפריט' : 'Открыть меню'}
            >
              <Menu className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </button>
          </div>

        </div>
      </header>

      {/* Выдвижное меню */}
      <MobileSidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
