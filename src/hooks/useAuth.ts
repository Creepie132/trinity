'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type UseAuthResult = {
  user: any | null
  orgId: string | null
  isAdmin: boolean
  isLoading: boolean
  signOut: () => Promise<void>
}

let cachedOrgId: string | null = null
let cachedIsAdmin: boolean | null = null

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<any | null>(null)
  const [orgId, setOrgId] = useState<string | null>(cachedOrgId)
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
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      setUser(user)

      // если уже кэшировали — не идём в БД
      if (cachedOrgId !== null || cachedIsAdmin !== null) {
        setOrgId(cachedOrgId)
        setIsAdmin(Boolean(cachedIsAdmin))
        setIsLoading(false)
        return
      }

      // проверка admin
      const { data: adminRow } = await supabase
        .from('admin_users')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle()

      const isAdminUser = !!adminRow

      // проверка org_users (для всех, включая админов)
      // ВАЖНО: ищем по user_id, а не по email!
      const { data: orgRow } = await supabase
        .from('org_users')
        .select('org_id')
        .eq('user_id', user.id)
        .maybeSingle()

      cachedIsAdmin = isAdminUser
      cachedOrgId = orgRow?.org_id ?? null

      setIsAdmin(isAdminUser)
      setOrgId(orgRow?.org_id ?? null)
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
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return {
    user,
    orgId,
    isAdmin,
    isLoading,
    signOut,
  }
}