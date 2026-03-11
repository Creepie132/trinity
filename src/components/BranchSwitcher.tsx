'use client'

import { useState, useRef, useEffect } from 'react'
import { Building2, ChevronDown, Check, Plus } from 'lucide-react'
import { useBranch } from '@/contexts/BranchContext'
import { useOrganization } from '@/hooks/useOrganization'
import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const t = {
  he: {
    mainBranch: 'ראשי',
    addBranch: 'הוסף סניף',
    branch: 'סניף',
  },
  ru: {
    mainBranch: 'Главная',
    addBranch: 'Добавить филиал',
    branch: 'Филиал',
  },
}

export function BranchSwitcher() {
  const { activeOrgId, mainOrgId, branches, switchBranch, isMainOrg, currentBranchName } = useBranch()
  const { data: mainOrg } = useOrganization()
  const { language } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'
  const tr = t[locale]

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Hide when no branches exist
  if (!branches || branches.length === 0) return null

  const activeBranchLabel = isMainOrg
    ? (mainOrg?.name || tr.mainBranch)
    : currentBranchName || tr.branch

  return (
    <div ref={ref} className="relative px-4 pb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
          'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700',
          'hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-[0.98]'
        )}
      >
        <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <span className="flex-1 text-start text-blue-800 dark:text-blue-300 truncate">
          {activeBranchLabel}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-blue-500 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute top-full start-4 end-4 mt-1 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* Main org option */}
          <button
            onClick={() => {
              if (mainOrgId) switchBranch(mainOrgId)
              setOpen(false)
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
                {mainOrg?.name || tr.mainBranch}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{tr.mainBranch}</p>
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
                  setOpen(false)
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

          {/* Add branch link */}
          <Link
            href="/settings/branches"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-t border-gray-200 dark:border-slate-600"
          >
            <Plus className="w-4 h-4" />
            <span>{tr.addBranch}</span>
          </Link>
        </div>
      )}
    </div>
  )
}
