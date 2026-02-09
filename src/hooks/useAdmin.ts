import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// Admin Dashboard Stats
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      // Total organizations
      const { count: totalOrgs } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })

      // Active organizations
      const { count: activeOrgs } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Total completed transactions
      const { count: totalTransactions } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')

      // Monthly revenue (current month)
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: monthlyPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('paid_at', startOfMonth.toISOString())

      const monthlyRevenue = monthlyPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

      return {
        totalOrgs: totalOrgs || 0,
        activeOrgs: activeOrgs || 0,
        totalTransactions: totalTransactions || 0,
        monthlyRevenue,
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

// Recent Organizations
export function useRecentOrganizations(limit = 5) {
  return useQuery({
    queryKey: ['admin', 'recent-orgs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    },
  })
}

// Organizations by Month (last 6 months)
export function useOrganizationsByMonth() {
  return useQuery({
    queryKey: ['admin', 'orgs-by-month'],
    queryFn: async () => {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const { data, error } = await supabase
        .from('organizations')
        .select('created_at')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      // Group by month
      const monthCounts: Record<string, number> = {}
      data.forEach((org) => {
        const date = new Date(org.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1
      })

      // Convert to array format for chart
      return Object.entries(monthCounts).map(([month, count]) => {
        const [year, monthNum] = month.split('-')
        const date = new Date(Number(year), Number(monthNum) - 1)
        const monthName = date.toLocaleDateString('he-IL', { month: 'short', year: 'numeric' })
        return {
          month: monthName,
          count,
        }
      })
    },
  })
}

// System Health Check
export function useSystemHealth() {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async () => {
      const response = await fetch('/api/health')
      if (!response.ok) {
        throw new Error('Health check failed')
      }
      return response.json()
    },
    refetchInterval: 10000, // Check every 10 seconds
  })
}

// All Organizations List
export function useAllOrganizations(searchQuery?: string) {
  return useQuery({
    queryKey: ['admin', 'all-orgs', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

// Organization Users
export function useOrgUsers(orgId?: string) {
  return useQuery({
    queryKey: ['admin', 'org-users', orgId],
    queryFn: async () => {
      if (!orgId) return []
      
      const { data, error } = await supabase
        .from('org_users')
        .select('*')
        .eq('org_id', orgId)
        .order('invited_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!orgId,
  })
}

// Single Organization
export function useOrganization(orgId?: string) {
  return useQuery({
    queryKey: ['admin', 'org', orgId],
    queryFn: async () => {
      if (!orgId) return null
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!orgId,
  })
}

// =============================================
// MUTATIONS
// =============================================

// Create Organization
export function useCreateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      email: string
      phone?: string
      category: string
      plan: string
    }) => {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: data.name,
          email: data.email,
          phone: data.phone,
          category: data.category,
          plan: data.plan,
        })
        .select()
        .single()

      if (orgError) throw orgError

      // Create owner user
      const { error: userError } = await supabase
        .from('org_users')
        .insert({
          org_id: org.id,
          email: data.email,
          role: 'owner',
        })

      if (userError) throw userError

      return org
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-orgs'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('ארגון נוצר בהצלחה')
    },
    onError: (error: any) => {
      toast.error(`שגיאה: ${error.message}`)
    },
  })
}

// Update Organization
export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { data: org, error } = await supabase
        .from('organizations')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return org
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-orgs'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'org', data.id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('ארגון עודכן בהצלחה')
    },
    onError: (error: any) => {
      toast.error(`שגיאה: ${error.message}`)
    },
  })
}

// Toggle Organization Feature
export function useToggleOrgFeature() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      orgId, 
      feature, 
      enabled 
    }: { 
      orgId: string
      feature: 'sms' | 'payments' | 'analytics'
      enabled: boolean 
    }) => {
      // Get current features
      const { data: org } = await supabase
        .from('organizations')
        .select('features')
        .eq('id', orgId)
        .single()

      if (!org) throw new Error('Organization not found')

      const features = org.features || {}
      features[feature] = enabled

      // Update features
      const { data, error } = await supabase
        .from('organizations')
        .update({ features })
        .eq('id', orgId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-orgs'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'org', data.id] })
    },
    onError: (error: any) => {
      toast.error(`שגיאה: ${error.message}`)
    },
  })
}

// Toggle Organization Active Status
export function useToggleOrgActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orgId, isActive }: { orgId: string, isActive: boolean }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update({ is_active: isActive })
        .eq('id', orgId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-orgs'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'org', data.id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success(data.is_active ? 'ארגון הופעל' : 'ארגון נחסם')
    },
    onError: (error: any) => {
      toast.error(`שגיאה: ${error.message}`)
    },
  })
}

// Add User to Organization
export function useAddOrgUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orgId, email, role }: { orgId: string, email: string, role?: string }) => {
      const { data, error } = await supabase
        .from('org_users')
        .insert({
          org_id: orgId,
          email,
          role: role || 'staff',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'org-users', variables.orgId] })
      toast.success('משתמש נוסף בהצלחה')
    },
    onError: (error: any) => {
      toast.error(`שגיאה: ${error.message}`)
    },
  })
}

// Remove User from Organization
export function useRemoveOrgUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, orgId }: { userId: string, orgId: string }) => {
      const { error } = await supabase
        .from('org_users')
        .delete()
        .eq('id', userId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'org-users', variables.orgId] })
      toast.success('משתמש הוסר')
    },
    onError: (error: any) => {
      toast.error(`שגיאה: ${error.message}`)
    },
  })
}

// =============================================
// BILLING HOOKS
// =============================================

// Billing Stats
export function useBillingStats() {
  return useQuery({
    queryKey: ['admin', 'billing-stats'],
    queryFn: async () => {
      // Paid count
      const { count: paidCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('billing_status', 'paid')

      // Trial count
      const { count: trialCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('billing_status', 'trial')

      // Overdue count
      const { count: overdueCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('billing_status', 'overdue')

      return {
        paid: paidCount || 0,
        trial: trialCount || 0,
        overdue: overdueCount || 0,
      }
    },
    refetchInterval: 30000,
  })
}

// Organizations for Billing (with filter)
export function useBillingOrganizations(statusFilter?: string) {
  return useQuery({
    queryKey: ['admin', 'billing-orgs', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('organizations')
        .select('*')
        .order('billing_due_date', { ascending: true, nullsFirst: false })

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('billing_status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

// Mark as Paid
export function useMarkAsPaid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orgId: string) => {
      // Calculate next billing date (30 days from now)
      const nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + 30)
      
      const { data, error } = await supabase
        .from('organizations')
        .update({
          billing_status: 'paid',
          billing_due_date: nextDate.toISOString().split('T')[0],
        })
        .eq('id', orgId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'billing-orgs'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'billing-stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-orgs'] })
      toast.success('תשלום סומן כשולם')
    },
    onError: (error: any) => {
      toast.error(`שגיאה: ${error.message}`)
    },
  })
}

// Update Organization Plan
export function useUpdateOrgPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orgId, plan }: { orgId: string, plan: string }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update({ plan })
        .eq('id', orgId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'billing-orgs'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-orgs'] })
      toast.success('תוכנית עודכנה')
    },
    onError: (error: any) => {
      toast.error(`שגיאה: ${error.message}`)
    },
  })
}

// =============================================
// AD CAMPAIGNS HOOKS
// =============================================

// Ad Campaigns Stats
export function useAdStats() {
  return useQuery({
    queryKey: ['admin', 'ad-stats'],
    queryFn: async () => {
      try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endDate = now.toISOString().split('T')[0]

        // Active campaigns
        const { count: activeCount, error: countError } = await supabase
          .from('ad_campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .lte('start_date', endDate)
          .gte('end_date', endDate)

        if (countError) {
          console.error('Ad stats count error:', countError)
          // Return default values instead of throwing
          return {
            activeCampaigns: 0,
            monthClicks: 0,
            avgCtr: '0.00',
          }
        }

        // Clicks this month
        const { data: campaigns, error: campaignsError } = await supabase
          .from('ad_campaigns')
          .select('clicks, impressions')
          .gte('created_at', startOfMonth.toISOString())

        if (campaignsError) {
          console.error('Ad stats campaigns error:', campaignsError)
          return {
            activeCampaigns: activeCount || 0,
            monthClicks: 0,
            avgCtr: '0.00',
          }
        }

        const monthClicks = campaigns?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0
        const monthImpressions = campaigns?.reduce((sum, c) => sum + (c.impressions || 0), 0) || 0
        const avgCtr = monthImpressions > 0 ? (monthClicks / monthImpressions * 100) : 0

        return {
          activeCampaigns: activeCount || 0,
          monthClicks,
          avgCtr: avgCtr.toFixed(2),
        }
      } catch (error) {
        console.error('Ad stats error:', error)
        // Return default values instead of throwing
        return {
          activeCampaigns: 0,
          monthClicks: 0,
          avgCtr: '0.00',
        }
      }
    },
    refetchInterval: 30000,
    retry: false,
    throwOnError: false,
  })
}

// All Ad Campaigns
export function useAdCampaigns() {
  return useQuery({
    queryKey: ['admin', 'ad-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Ad campaigns query error:', error)
        // If table doesn't exist, return empty array
        if (error.code === 'PGRST204' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.warn('ad_campaigns table does not exist. Please run schema-v2.sql migration.')
          return []
        }
        return []
      }
      return data || []
    },
    retry: false,
    throwOnError: false,
  })
}

// Single Ad Campaign
export function useAdCampaign(id?: string) {
  return useQuery({
    queryKey: ['admin', 'ad-campaign', id],
    queryFn: async () => {
      if (!id) return null
      
      const { data, error } = await supabase
        .from('ad_campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// Create Ad Campaign
export function useCreateAdCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      advertiser_name: string
      banner_url: string
      link_url: string
      target_categories: string[]
      start_date: string
      end_date: string
    }) => {
      const { data: campaign, error } = await supabase
        .from('ad_campaigns')
        .insert({
          ...data,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error
      return campaign
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ad-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'ad-stats'] })
      toast.success('קמפיין נוצר בהצלחה')
    },
    onError: (error: any) => {
      toast.error(`שגיאה: ${error.message}`)
    },
  })
}

// Update Ad Campaign
export function useUpdateAdCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { data: campaign, error } = await supabase
        .from('ad_campaigns')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return campaign
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ad-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'ad-campaign', data.id] })
      toast.success('קמפיין עודכן')
    },
    onError: (error: any) => {
      toast.error(`שגיאה: ${error.message}`)
    },
  })
}

// Toggle Ad Campaign Active
export function useToggleAdActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      const { data, error } = await supabase
        .from('ad_campaigns')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ad-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'ad-stats'] })
      toast.success('סטטוס קמפיין עודכן')
    },
    onError: (error: any) => {
      toast.error(`שגיאה: ${error.message}`)
    },
  })
}

// Delete Ad Campaign
export function useDeleteAdCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_campaigns')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ad-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'ad-stats'] })
      toast.success('קמפיין נמחק')
    },
    onError: (error: any) => {
      toast.error(`שגיאה: ${error.message}`)
    },
  })
}

// Upload Banner to Storage (via API route to bypass RLS)
export async function uploadBanner(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload/banner', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }

  const { url } = await response.json()
  return url
}
