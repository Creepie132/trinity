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
        .eq('email', user.email)
        .maybeSingle()

      if (adminRow) {
        cachedIsAdmin = true
        cachedOrgId = null

        setIsAdmin(true)
        setOrgId(null)
        setIsLoading(false)
        return
      }

      // проверка org_users
      const { data: orgRow } = await supabase
        .from('org_users')
        .select('org_id')
        .eq('email', user.email)
        .maybeSingle()

      cachedIsAdmin = false
      cachedOrgId = orgRow?.org_id ?? null

      setIsAdmin(false)
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