'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export interface Branch {
  id: string
  parent_org_id: string
  child_org_id: string
  name: string
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  org?: {
    id: string
    name: string
    email: string | null
    phone: string | null
    category: string
  }
}

export function useBranches() {
  const { orgId } = useAuth()

  return useQuery({
    queryKey: ['branches', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select(`
          *,
          org:organizations!child_org_id (
            id, name, email, phone, category
          )
        `)
        .eq('parent_org_id', orgId)
        .order('name')

      if (error) throw error
      return (data || []) as Branch[]
    },
  })
}

export function useCreateBranch() {
  const queryClient = useQueryClient()
  const { orgId } = useAuth()

  return useMutation({
    mutationFn: async (data: {
      branchName: string
      orgName: string
      address?: string
      phone?: string
      category?: string
    }) => {
      // 1. Create new organization for the branch
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: data.orgName,
          phone: data.phone || null,
          category: data.category || 'other',
          plan: 'basic',
          is_active: true,
          features: {},
        })
        .select()
        .single()

      if (orgError) throw orgError

      // 2. Create branch record linking parent → child
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .insert({
          parent_org_id: orgId,
          child_org_id: newOrg.id,
          name: data.branchName,
          address: data.address || null,
          phone: data.phone || null,
          is_active: true,
        })
        .select()
        .single()

      if (branchError) throw branchError

      // 3. Add current user as owner of the new branch org
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('org_users').insert({
          user_id: user.id,
          org_id: newOrg.id,
          role: 'owner',
        })
      }

      return branch
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      toast.success('הסניף נוצר בהצלחה')
    },
    onError: (error: any) => {
      toast.error('שגיאה ביצירת סניף: ' + error.message)
    },
  })
}

export function useUpdateBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      name?: string
      address?: string
      phone?: string
      is_active?: boolean
    }) => {
      const { data: branch, error } = await supabase
        .from('branches')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return branch
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      toast.success('הסניף עודכן בהצלחה')
    },
    onError: (error: any) => {
      toast.error('שגיאה בעדכון סניף: ' + error.message)
    },
  })
}
