'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Organization {
  id: string
  name: string
  email: string | null
  phone: string | null
  category: string
  plan: string
  is_active: boolean
  features: {
    sms: boolean
    payments: boolean
    analytics: boolean
    subscriptions?: boolean
    visits?: boolean
    inventory?: boolean
    meeting_mode?: boolean
    modules?: Record<string, boolean>
  }
  billing_status: string
  billing_due_date: string | null
  created_at: string
}

async function fetchCurrentOrganization(): Promise<Organization | null> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return null
    }

    // Get user's organization through org_users
    const { data: orgUser, error: orgUserError } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgUserError || !orgUser) {
      console.error('Error fetching org_user:', orgUserError)
      return null
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgUser.org_id)
      .single()

    if (orgError || !organization) {
      console.error('Error fetching organization:', orgError)
      return null
    }

    return organization as Organization
  } catch (error) {
    console.error('Error in fetchCurrentOrganization:', error)
    return null
  }
}

export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: fetchCurrentOrganization,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}
