import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { SmsCampaign, SmsMessage } from '@/types/database'
import { toast } from 'sonner'
const supabase = createSupabaseBrowserClient()

interface CreateCampaignParams {
  name: string
  message: string
  filter_type: 'all' | 'single' | 'inactive_days'
  filter_value?: string
}

export function useSmsCampaigns() {
  return useQuery({
    queryKey: ['sms-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as SmsCampaign[]
    },
  })
}

export function useSmsCampaign(id?: string) {
  return useQuery({
    queryKey: ['sms-campaign', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('sms_campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as SmsCampaign
    },
    enabled: !!id,
  })
}

export function useSmsMessages(campaignId?: string) {
  return useQuery({
    queryKey: ['sms-messages', campaignId],
    queryFn: async () => {
      if (!campaignId) return []

      const { data, error } = await supabase
        .from('sms_messages')
        .select(`
          *,
          clients:client_id (
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('campaign_id', campaignId)
        .order('sent_at', { ascending: false })

      if (error) throw error
      return data as any[]
    },
    enabled: !!campaignId,
  })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateCampaignParams) => {
      const response = await fetch('/api/sms/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create campaign')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-campaigns'] })
      toast.success('הקמפיין נוצר והודעות נשלחו')
    },
    onError: (error: any) => {
      toast.error('שגיאה ביצירת קמפיין: ' + error.message)
    },
  })
}

export function useRecipientsCount(filterType: string, filterValue?: string) {
  return useQuery({
    queryKey: ['recipients-count', filterType, filterValue],
    queryFn: async () => {
      if (filterType === 'all') {
        const { count, error } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .not('phone', 'is', null)

        if (error) throw error
        return count || 0
      } else if (filterType === 'single') {
        return 1
      } else if (filterType === 'inactive_days' && filterValue) {
        const days = parseInt(filterValue)
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)

        const { count, error } = await supabase
          .from('client_summary')
          .select('*', { count: 'exact', head: true })
          .not('phone', 'is', null)
          .or(`last_visit.is.null,last_visit.lt.${cutoffDate.toISOString()}`)

        if (error) throw error
        return count || 0
      }

      return 0
    },
    enabled: !!filterType,
  })
}
