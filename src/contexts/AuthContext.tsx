'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type AuthContextType = {
  user: any | null
  orgId: string | null
  role: 'user' | 'moderator' | 'owner' | null
  isAdmin: boolean
  isLoading: boolean
  signOut: () => Promise<void>
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [role, setRole] = useState<'user' | 'moderator' | 'owner' | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const loadAuth = async () => {
    try {
      setIsLoading(true)
      setHasError(false)

      // FIX: Timeout after 5 seconds to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn('[AuthProvider] loadAuth timeout - stopping spinner')
        setUser(null)
        setOrgId(null)
        setRole(null)
        setIsAdmin(false)
        setIsLoading(false)
        setHasError(true)
      }, 5000)

      // Step 1: Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        clearTimeout(timeoutId)
        setUser(null)
        setOrgId(null)
        setRole(null)
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      // Step 2: Get user
      const { data: { user }, error: getUserError } = await supabase.auth.getUser()

      if (getUserError || !user) {
        clearTimeout(timeoutId)
        setUser(null)
        setOrgId(null)
        setRole(null)
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      setUser(user)

      // Step 3: Check admin and org in parallel (Promise.all)
      const [adminResult, orgResult] = await Promise.all([
        supabase
          .from('admin_users')
          .select('email')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('org_users')
          .select('org_id, role')
          .eq('user_id', user.id)
          .maybeSingle()
      ])

      const isAdminUser = !!adminResult.data
      const userOrgId = orgResult.data?.org_id ?? null
      const userRole = orgResult.data?.role ?? null

      setIsAdmin(isAdminUser)
      setOrgId(userOrgId)
      setRole(userRole as 'user' | 'moderator' | 'owner' | null)
      clearTimeout(timeoutId)
      setIsLoading(false)
    } catch (error) {
      console.error('[AuthProvider] Error in loadAuth:', error)
      // Don't block render on auth error
      setUser(null)
      setOrgId(null)
      setRole(null)
      setIsAdmin(false)
      setIsLoading(false)
      setHasError(true)
    }
  }

  useEffect(() => {
    // Wrap everything in try-catch to prevent crashes
    try {
      // Load auth once on mount
      loadAuth().catch((err) => {
        console.error('[AuthProvider] loadAuth failed in useEffect:', err)
        setIsLoading(false)
        setHasError(true)
      })

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        try {
          // Only reload on significant events
          if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            if (event === 'SIGNED_OUT') {
              setUser(null)
              setOrgId(null)
              setRole(null)
              setIsAdmin(false)
              setIsLoading(false)
            } else {
              loadAuth().catch((err) => {
                console.error('[AuthProvider] loadAuth failed in onAuthStateChange:', err)
                setIsLoading(false)
                setHasError(true)
              })
            }
          }
          // Ignore TOKEN_REFRESHED, INITIAL_SESSION, etc. - they don't need reload
        } catch (err) {
          console.error('[AuthProvider] Error in onAuthStateChange handler:', err)
        }
      })

      return () => {
        try {
          subscription.unsubscribe()
        } catch (err) {
          console.error('[AuthProvider] Error unsubscribing:', err)
        }
      }
    } catch (err) {
      console.error('[AuthProvider] Error in useEffect setup:', err)
      setIsLoading(false)
      setHasError(true)
    }
  }, []) // No dependencies - run once on mount only

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setOrgId(null)
      setRole(null)
      setIsAdmin(false)
      window.location.href = '/login'
    } catch (err) {
      console.error('[AuthProvider] signOut error:', err)
      // Still redirect to login even if signOut fails
      window.location.href = '/login'
    }
  }

  const refetch = async () => {
    try {
      await loadAuth()
    } catch (err) {
      console.error('[AuthProvider] refetch error:', err)
    }
  }

  // Always render children, even if auth fails
  // This prevents blank screen on auth errors

  return (
    <AuthContext.Provider
      value={{
        user,
        orgId,
        role,
        isAdmin,
        isLoading,
        signOut,
        refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    // Don't throw error - return safe defaults to prevent crash
    console.warn('[useAuth] Called outside AuthProvider - returning defaults')
    return {
      user: null,
      orgId: null,
      role: null,
      isAdmin: false,
      isLoading: false,
      signOut: async () => {},
      refetch: async () => {},
    }
  }
  return context
}
