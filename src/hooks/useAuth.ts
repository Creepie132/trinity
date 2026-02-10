'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const [user, setUser] = useState<any | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadAuth = async () => {
    console.log('[useAuth] ========== START loadAuth ==========')
    console.log('[useAuth] Timestamp:', new Date().toISOString())
    setIsLoading(true)

    try {
      console.log('[useAuth] Calling supabase.auth.getUser()...')
      const startTime = performance.now()
      const {
        data: { user },
        error: getUserError
      } = await supabase.auth.getUser()
      const endTime = performance.now()

      console.log('[useAuth] GetUser completed in', Math.round(endTime - startTime), 'ms')
      console.log('[useAuth] GetUser result:', { 
        user: user ? { 
          id: user.id, 
          email: user.email,
          created_at: user.created_at 
        } : null, 
        error: getUserError 
      })

      if (getUserError) {
        console.error('[useAuth] ❌ GetUser ERROR:', getUserError)
        console.error('[useAuth] Error name:', getUserError.name)
        console.error('[useAuth] Error message:', getUserError.message)
        
        // If AuthSessionMissingError - session not found in cookies/storage
        if (getUserError.name === 'AuthSessionMissingError') {
          console.warn('[useAuth] 🔴 Auth session missing - user needs to login')
          console.warn('[useAuth] This usually means:')
          console.warn('[useAuth] 1. Session expired')
          console.warn('[useAuth] 2. Cookies cleared')
          console.warn('[useAuth] 3. Never logged in')
        }
      }

      if (!user) {
        console.warn('[useAuth] ⚠️ No user found - setting everything to null')
        setUser(null)
        setOrgId(null)
        setIsAdmin(false)
        setIsLoading(false)
        console.log('[useAuth] ========== END loadAuth (no user) ==========')
        return
      }

      console.log('[useAuth] ✅ User found:', {
        id: user.id,
        email: user.email,
        phone: user.phone,
        created_at: user.created_at
      })

      setUser(user)

      // Проверка admin (по user_id)
      console.log('[useAuth] Checking admin status for user_id:', user.id)
      const { data: adminRow, error: adminError } = await supabase
        .from('admin_users')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle()

      if (adminError) {
        console.error('[useAuth] ❌ Admin check error:', adminError)
      } else {
        console.log('[useAuth] Admin check result:', adminRow ? '✅ IS ADMIN' : '❌ NOT ADMIN')
      }

      const isAdminUser = !!adminRow

      // Проверка org_users (по user_id)
      console.log('[useAuth] Checking org_users for user_id:', user.id)
      const { data: orgRow, error: orgError } = await supabase
        .from('org_users')
        .select('org_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (orgError) {
        console.error('[useAuth] ❌ Org check error:', orgError)
      } else {
        console.log('[useAuth] Org check result:', orgRow ? `✅ Found org_id: ${orgRow.org_id}` : '❌ NO ORG')
      }

      const userOrgId = orgRow?.org_id ?? null

      console.log('[useAuth] Final state:', {
        isAdmin: isAdminUser,
        orgId: userOrgId
      })

      setIsAdmin(isAdminUser)
      setOrgId(userOrgId)
      setIsLoading(false)
      console.log('[useAuth] ========== END loadAuth ==========')
      console.log('[useAuth] Total time:', Math.round(performance.now() - startTime), 'ms')
    } catch (error) {
      console.error('[useAuth] ❌❌❌ EXCEPTION:', error)
      setUser(null)
      setOrgId(null)
      setIsAdmin(false)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    console.log('[useAuth] useEffect triggered - initial mount')
    loadAuth()

    // Listen for auth state changes
    console.log('[useAuth] Setting up onAuthStateChange listener...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useAuth] Auth state changed:', {
        event,
        hasSession: !!session,
        hasUser: !!session?.user
      })

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('[useAuth] Session updated - reloading auth...')
        loadAuth()
      } else if (event === 'SIGNED_OUT') {
        console.log('[useAuth] User signed out - clearing state')
        setUser(null)
        setOrgId(null)
        setIsAdmin(false)
      } else if (session?.user) {
        console.log('[useAuth] Other event with user - reloading auth...')
        loadAuth()
      } else {
        console.log('[useAuth] No session - clearing state')
        setUser(null)
        setOrgId(null)
        setIsAdmin(false)
      }
    })

    return () => {
      console.log('[useAuth] Cleaning up - unsubscribing from auth changes')
      subscription.unsubscribe()
    }
  }, [])

  // Refetch auth when pathname changes (navigation between pages)
  useEffect(() => {
    console.log('[useAuth] Pathname changed:', pathname)
    console.log('[useAuth] Current state before refetch:', { 
      hasUser: !!user, 
      userId: user?.id,
      orgId 
    })
    
    // Force refetch on route change to ensure fresh auth data
    if (!isLoading) {
      console.log('[useAuth] Triggering refetch due to pathname change...')
      loadAuth()
    }
  }, [pathname])

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