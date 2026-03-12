'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useBranches, Branch } from '@/hooks/useBranches'

const STORAGE_KEY = 'trinity_active_branch'

interface BranchContextType {
  /** Currently active org ID (main org or branch child_org_id) */
  activeOrgId: string | null
  /** The user's primary org from auth */
  mainOrgId: string | null
  /** All branches of the main org */
  branches: Branch[]
  isLoadingBranches: boolean
  /** Switch the active org and invalidate all queries */
  switchBranch: (orgId: string) => void
  /** Name of the active branch, null when on main org */
  currentBranchName: string | null
  /** True when activeOrgId === mainOrgId */
  isMainOrg: boolean
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

export function BranchProvider({ children }: { children: ReactNode }) {
  const { orgId } = useAuth()
  const queryClient = useQueryClient()
  const { data: branches = [], isLoading: isLoadingBranches } = useBranches()

  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(STORAGE_KEY)
  })

  // При загрузке: восстанавливаем активный филиал из БД
  useEffect(() => {
    if (!orgId) return
    fetch('/api/user/active-branch')
      .then((r) => r.json())
      .then(({ activeOrgId: dbOrgId }) => {
        if (dbOrgId) {
          setActiveOrgId(dbOrgId)
          localStorage.setItem(STORAGE_KEY, dbOrgId)
        }
      })
      .catch(() => {})
  }, [orgId])


  const switchBranch = useCallback(
    (newOrgId: string) => {
      setActiveOrgId(newOrgId)
      localStorage.setItem(STORAGE_KEY, newOrgId)
      // Сохраняем в БД — источник истины на сервере
      fetch('/api/set-active-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: newOrgId }),
      }).catch(() => {
        // Ошибка не критична — localStorage уже обновлён
      })
      // Invalidate all data queries so they refetch with new org
      queryClient.invalidateQueries()
    },
    [queryClient]
  )

  const effectiveOrgId = activeOrgId || orgId
  const isMainOrg = effectiveOrgId === orgId

  const currentBranchName = isMainOrg
    ? null
    : branches.find((b) => b.child_org_id === effectiveOrgId)?.name ?? null

  return (
    <BranchContext.Provider
      value={{
        activeOrgId: effectiveOrgId,
        mainOrgId: orgId,
        branches,
        isLoadingBranches,
        switchBranch,
        currentBranchName,
        isMainOrg,
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch(): BranchContextType {
  const context = useContext(BranchContext)
  if (context === undefined) {
    // Safe fallback outside of provider
    return {
      activeOrgId: null,
      mainOrgId: null,
      branches: [],
      isLoadingBranches: false,
      switchBranch: () => {},
      currentBranchName: null,
      isMainOrg: true,
    }
  }
  return context
}
