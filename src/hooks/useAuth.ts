'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type UseAuthResult = {
  user: any | null
  orgId: string | null
  organizations: Array<{ org_id: string; org_name: string }> | null
  isAdmin: boolean
  isLoading: boolean
  signOut: () => Promise<void>
  setCurrentOrg: (orgId: string) => void
}

let cachedOrgId: string | null = null
let cachedIsAdmin: boolean | null = null
let cachedOrganizations: Array<{ org_id: string; org_name: string }> | null = null

// Читаем из localStorage при загрузке
if (typeof window !== 'undefined') {
  const savedOrgId = localStorage.getItem('current_org_id')
  if (savedOrgId) {
    cachedOrgId = savedOrgId
  }
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<any | null>(null)
  const [orgId, setOrgId] = useState<string | null>(cachedOrgId)
  const [organizations, setOrganizations] = useState<Array<{ org_id: string; org_name: string }> | null>(cachedOrganizations)
  const [isAdmin, setIsAdmin] = useState<boolean>(cachedIsAdmin ?? false)
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

      // проверка admin по USER_ID
      const { data: adminRow } = await supabase
        .from('admin_users')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle()

      const isAdminUser = !!adminRow

      // получаем ВСЕ организации пользователя по USER_ID
      const { data: orgRows } = await supabase
        .from('org_users')
        .select(`
          org_id,
          organizations (
            name
          )
        `)
        .eq('user_id', user.id)

      const userOrganizations = (orgRows || []).map((row: any) => ({
        org_id: row.org_id,
        org_name: row.organizations?.name || 'Unknown',
      }))

      cachedIsAdmin = isAdminUser
      cachedOrganizations = userOrganizations

      // Если есть сохранённая организация - используем её
      // Если нет - берём первую
      let selectedOrgId = cachedOrgId
      if (!selectedOrgId && userOrganizations.length > 0) {
        selectedOrgId = userOrganizations[0].org_id
        if (selectedOrgId) {
          localStorage.setItem('current_org_id', selectedOrgId)
        }
      }

      cachedOrgId = selectedOrgId

      setIsAdmin(isAdminUser)
      setOrganizations(userOrganizations)
      setOrgId(selectedOrgId)
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
    cachedOrganizations = null
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
    isLoading,
    signOut,
    setCurrentOrg,
  }
}
