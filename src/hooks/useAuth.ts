'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type UseAuthResult = {
  user: any | null
  orgId: string | null
  isAdmin: boolean
  isLoading: boolean
  signOut: () => Promise<void>
  refetch: () => Promise<void>
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<any | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadAuth = async () => {
    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setUser(null)
        setOrgId(null)
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      setUser(user)

      console.log('[useAuth] Loading auth for user:', user.id)

      // Проверка admin (по user_id)
      const { data: adminRow, error: adminError } = await supabase
        .from('admin_users')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle()

      if (adminError) {
        console.error('[useAuth] Admin check error:', adminError)
      }

      const isAdminUser = !!adminRow
      console.log('[useAuth] Is admin:', isAdminUser)

      // Проверка org_users (по user_id)
      const { data: orgRow, error: orgError } = await supabase
        .from('org_users')
        .select('org_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (orgError) {
        console.error('[useAuth] Org check error:', orgError)
      }

      const userOrgId = orgRow?.org_id ?? null
      console.log('[useAuth] Org ID:', userOrgId)

      setIsAdmin(isAdminUser)
      setOrgId(userOrgId)
      setIsLoading(false)
    } catch (error) {
      console.error('[useAuth] Load error:', error)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadAuth()
      } else {
        setUser(null)
        setOrgId(null)
        setIsAdmin(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setOrgId(null)
    setIsAdmin(false)
    window.location.href = '/login'
  }

  const refetch = async () => {
    await loadAuth()
  }

  return {
    user,
    orgId,
    isAdmin,
    isLoading,
    signOut,
    refetch,
  }
}