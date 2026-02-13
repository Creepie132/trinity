'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type AuthContextType = {
  user: any | null
  orgId: string | null
  isAdmin: boolean
  isLoading: boolean
  signOut: () => Promise<void>
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadAuth = async () => {
    setIsLoading(true)

    try {
      // Step 1: Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        setUser(null)
        setOrgId(null)
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      // Step 2: Get user
      const { data: { user }, error: getUserError } = await supabase.auth.getUser()

      if (getUserError || !user) {
        setUser(null)
        setOrgId(null)
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
          .select('org_id')
          .eq('user_id', user.id)
          .maybeSingle()
      ])

      const isAdminUser = !!adminResult.data
      const userOrgId = orgResult.data?.org_id ?? null

      setIsAdmin(isAdminUser)
      setOrgId(userOrgId)
      setIsLoading(false)
    } catch (error) {
      setUser(null)
      setOrgId(null)
      setIsAdmin(false)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Load auth once on mount
    loadAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only reload on significant events
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setOrgId(null)
          setIsAdmin(false)
          setIsLoading(false)
        } else {
          loadAuth()
        }
      }
      // Ignore TOKEN_REFRESHED, INITIAL_SESSION, etc. - they don't need reload
    })

    return () => {
      subscription.unsubscribe()
    }
  }, []) // No dependencies - run once on mount only

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

  return (
    <AuthContext.Provider
      value={{
        user,
        orgId,
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
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
