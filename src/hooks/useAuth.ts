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
      // CRITICAL FIX: Check session FIRST before making any DB queries
      // This prevents race condition where we try to fetch user before session is restored from localStorage
      console.log('[useAuth] Step 1: Checking for existing session...')
      const sessionStartTime = performance.now()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      const sessionEndTime = performance.now()
      
      console.log('[useAuth] Session check completed in', Math.round(sessionEndTime - sessionStartTime), 'ms')
      console.log('[useAuth] Session result:', {
        hasSession: !!session,
        sessionError: sessionError?.message
      })

      if (sessionError) {
        console.error('[useAuth] ❌ Session ERROR:', sessionError)
      }

      // If no session exists, don't even try to get user or query DB
      if (!session) {
        console.warn('[useAuth] ⚠️ No session found - user not logged in')
        setUser(null)
        setOrgId(null)
        setIsAdmin(false)
        setIsLoading(false)
        console.log('[useAuth] ========== END loadAuth (no session) ==========')
        return
      }

      // Session exists, now safe to get user
      console.log('[useAuth] Step 2: Session found, getting user details...')
      const userStartTime = performance.now()
      const {
        data: { user },
        error: getUserError
      } = await supabase.auth.getUser()
      const userEndTime = performance.now()

      console.log('[useAuth] GetUser completed in', Math.round(userEndTime - userStartTime), 'ms')
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
        
        // If AuthSessionMissingError despite session check - clear everything
        if (getUserError.name === 'AuthSessionMissingError') {
          console.error('[useAuth] 🔴 AuthSessionMissingError AFTER session check - clearing state')
          setUser(null)
          setOrgId(null)
          setIsAdmin(false)
          setIsLoading(false)
          return
        }
      }

      if (!user) {
        console.warn('[useAuth] ⚠️ No user found despite session - setting everything to null')
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

      // CRITICAL: Auto-link org_users.user_id after first login
      // This fixes the issue where invitations create org_users with email but user_id = null
      // After Google login, we need to link the auth.uid to the org_users entry
      console.log('[useAuth] Step 2.5: Auto-linking org_users.user_id...')
      try {
        const linkResponse = await fetch('/api/org/link-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        
        if (linkResponse.ok) {
          const linkResult = await linkResponse.json()
          console.log('[useAuth] ✅ Link-user result:', linkResult)
          
          if (linkResult.linked) {
            console.log('[useAuth] 🔗 Successfully linked user_id to', linkResult.count, 'org(s)')
          } else {
            console.log('[useAuth] ℹ️  No pending links (already linked or no invitation)')
          }
        } else {
          console.warn('[useAuth] ⚠️  Link-user failed:', await linkResponse.text())
          // Non-fatal, continue
        }
      } catch (linkError) {
        console.error('[useAuth] ❌ Link-user exception:', linkError)
        // Non-fatal, continue
      }

      // Step 3: Check admin status (safe to query DB now that we have confirmed session + user)
      console.log('[useAuth] Step 3: Checking admin status for user_id:', user.id)
      const adminStartTime = performance.now()
      const { data: adminRow, error: adminError } = await supabase
        .from('admin_users')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle()
      const adminEndTime = performance.now()

      console.log('[useAuth] Admin check completed in', Math.round(adminEndTime - adminStartTime), 'ms')
      if (adminError) {
        console.error('[useAuth] ❌ Admin check error:', adminError)
      } else {
        console.log('[useAuth] Admin check result:', adminRow ? '✅ IS ADMIN' : '❌ NOT ADMIN')
      }

      const isAdminUser = !!adminRow

      // Step 4: Check org_users (safe to query DB)
      console.log('[useAuth] Step 4: Checking org_users for user_id:', user.id)
      const orgStartTime = performance.now()
      const { data: orgRow, error: orgError } = await supabase
        .from('org_users')
        .select('org_id')
        .eq('user_id', user.id)
        .maybeSingle()
      const orgEndTime = performance.now()

      console.log('[useAuth] Org check completed in', Math.round(orgEndTime - orgStartTime), 'ms')
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
      console.log('[useAuth] Total time:', Math.round(performance.now() - sessionStartTime), 'ms')
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