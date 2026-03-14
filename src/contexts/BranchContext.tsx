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
const COOKIE_KEY = 'trinity_active_branch'

/** Читает активный филиал синхронно — сначала из cookie (быстро), потом из localStorage */
function getInitialBranch(): string | null {
  if (typeof window === 'undefined') return null
  // Cookie устанавливается сервером при смене филиала — самый быстрый источник
  const cookieMatch = document.cookie
    .split('; ')
    .find((row) => row.startsWith(COOKIE_KEY + '='))
  if (cookieMatch) return cookieMatch.split('=')[1]
  // Fallback на localStorage
  return localStorage.getItem(STORAGE_KEY)
}

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
  /** True when activeOrgId is confirmed from DB (not just cookie/localStorage) */
  isOrgResolved: boolean
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

export function BranchProvider({ children }: { children: ReactNode }) {
  const { orgId } = useAuth()
  const queryClient = useQueryClient()
  const { data: branches = [], isLoading: isLoadingBranches } = useBranches()

  // При отсутствии cookie — сразу используем orgId как fallback чтобы не блокировать запросы
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => getInitialBranch() || null)
  // isOrgResolved: true когда org подтверждён из auth или из БД (не просто cookie)
  const [isOrgResolved, setIsOrgResolved] = useState<boolean>(() => {
    // Если cookie уже есть — считаем что org достаточно известен для первого рендера
    return typeof window !== 'undefined' && !!getInitialBranch()
  })

  // Как только orgId из auth готов — сразу применяем его если нет cookie
  useEffect(() => {
    if (orgId && !activeOrgId) {
      setActiveOrgId(orgId)
      setIsOrgResolved(true)
    } else if (orgId && activeOrgId) {
      // orgId из auth пришёл, activeOrgId уже был из cookie — всё готово
      setIsOrgResolved(true)
    }
  }, [orgId, activeOrgId])

  // При загрузке: восстанавливаем активный филиал из БД
  useEffect(() => {
    if (!orgId) return
    fetch('/api/user/active-branch')
      .then((r) => r.json())
      .then(({ activeOrgId: dbOrgId }) => {
        // Берём из БД или fallback на mainOrgId
        const resolvedId = dbOrgId || orgId
        setActiveOrgId(resolvedId)
        setIsOrgResolved(true)
        localStorage.setItem(STORAGE_KEY, resolvedId)
        // ВАЖНО: ставим cookie — useOrganization читает её синхронно
        // Без этой cookie после свежего логина org = null и разделы исчезают
        document.cookie = `${COOKIE_KEY}=${resolvedId}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
      })
      .catch(() => {
        // Fallback при ошибке сети — хотя бы поставить mainOrgId
        document.cookie = `${COOKIE_KEY}=${orgId}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
        localStorage.setItem(STORAGE_KEY, orgId)
        setIsOrgResolved(true)
      })
  }, [orgId])


  const switchBranch = useCallback(
    (newOrgId: string) => {
      setActiveOrgId(newOrgId)
      localStorage.setItem(STORAGE_KEY, newOrgId)
      // Сразу пишем в cookie — чтобы при следующей загрузке не было flash
      document.cookie = `${COOKIE_KEY}=${newOrgId}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
      // Сохраняем в БД — источник истины на сервере
      fetch('/api/set-active-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: newOrgId }),
      }).catch(() => {})
      // Удаляем кэш полностью — чтобы не было flash старых данных
      queryClient.removeQueries()
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
        isOrgResolved,
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
      isOrgResolved: false,
    }
  }
  return context
}
