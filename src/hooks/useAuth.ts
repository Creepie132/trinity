'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type UseAuthResult = {
  user: any | null
  orgId: string | null
  organizations: Array<{ org_id: string; org_name: string }> | null
  isAdmin: boolean
  isSalesAgent: boolean
  role: string | null
  isLoading: boolean
  signOut: () => Promise<void>
  setCurrentOrg: (orgId: string) => void
}

let cachedOrgId: string | null = null
let cachedIsAdmin: boolean | null = null
let cachedIsSalesAgent: boolean | null = null
let cachedRole: string | null = null
let cachedOrganizations: Array<{ org_id: string; org_name: string; role: string }> | null = null
let cachedUserId: string | null = null

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<any | null>(null)
  const [orgId, setOrgId] = useState<string | null>(cachedOrgId)
  const [organizations, setOrganizations] = useState<Array<{ org_id: string; org_name: string; role: string }> | null>(cachedOrganizations)
  const [isAdmin, setIsAdmin] = useState<boolean>(cachedIsAdmin ?? false)
  const [isSalesAgent, setIsSalesAgent] = useState<boolean>(cachedIsSalesAgent ?? false)
  const [role, setRole] = useState<string | null>(cachedRole)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadAuth = async () => {
      setIsLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!mounted) return

      if (!user) {
        setUser(null)
        setOrgId(null)
        setOrganizations(null)
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      setUser(user)

      // Если сменился пользователь — сбрасываем кэш
      if (cachedUserId && cachedUserId !== user.id) {
        cachedOrgId = null
        cachedIsAdmin = null
        cachedIsSalesAgent = null
        cachedRole = null
        cachedOrganizations = null
      }
      cachedUserId = user.id

      // проверка admin по USER_ID
      const { data: adminRow } = await supabase
        .from('admin_users')
        .select('email, is_sales_agent')
        .eq('user_id', user.id)
        .maybeSingle()

      const isAdminUser = !!adminRow
      const isSalesAgentUser = adminRow?.is_sales_agent ?? false

      // получаем ВСЕ организации пользователя по USER_ID
      const { data: orgRows } = await supabase
        .from('org_users')
        .select(`
          org_id,
          role,
          organizations (
            name
          )
        `)
        .eq('user_id', user.id)

      const userOrganizations = (orgRows || []).map((row: any) => ({
        org_id: row.org_id,
        org_name: row.organizations?.name || 'Unknown',
        role: row.role || 'user',
      }))

      cachedIsAdmin = isAdminUser
      cachedIsSalesAgent = isSalesAgentUser
      cachedOrganizations = userOrganizations

      // Если есть кэшированная организация - проверяем что она принадлежит этому пользователю
      // Если нет или не принадлежит - берём первую
      let selectedOrgId = cachedOrgId
      const orgIds = userOrganizations.map((o: any) => o.org_id)
      if (!selectedOrgId || !orgIds.includes(selectedOrgId)) {
        selectedOrgId = userOrganizations.length > 0 ? userOrganizations[0].org_id : null
      }
      if (selectedOrgId) {
        localStorage.setItem('current_org_id', selectedOrgId)
      }

      cachedOrgId = selectedOrgId

      // Найти роль для выбранной организации
      const currentOrgData = userOrganizations.find((org: any) => org.org_id === selectedOrgId)
      const userRole = currentOrgData?.role || 'user'
      cachedRole = userRole

      setIsAdmin(isAdminUser)
      setIsSalesAgent(isSalesAgentUser)
      setOrganizations(userOrganizations)
      setOrgId(selectedOrgId)
      setRole(userRole)
      setIsLoading(false)
    }

    loadAuth()

    return () => {
      mounted = false
    }
  }, [])

  const signOut = async () => {
    cachedOrgId = null
    cachedIsAdmin = null
    cachedRole = null
    cachedOrganizations = null
    cachedUserId = null
    localStorage.removeItem('current_org_id')
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const setCurrentOrg = (newOrgId: string) => {
    setOrgId(newOrgId)
    cachedOrgId = newOrgId
    localStorage.setItem('current_org_id', newOrgId)
    // Перезагружаем страницу чтобы обновить все данные
    window.location.reload()
  }

  return {
    user,
    orgId,
    organizations,
    isAdmin,
    isSalesAgent,
    role,
    isLoading,
    signOut,
    setCurrentOrg,
  }
}
