import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { SmsCampaign, SmsMessage } from '@/types/database'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
const supabase = createSupabaseBrowserClient()

interface CreateCampaignParams {
  name: string
  message: string
  filter_type: 'all' | 'single' | 'inactive_days'
  filter_value?: string
}

export function useSmsCampaigns() {
  const { orgId } = useAuth()

  return useQuery({
    queryKey: ['sms-campaigns', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_campaigns')
        .select('*')
        .eq('org_id', orgId) // 🔒 Фильтрация по организации
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as SmsCampaign[]
    },
  })
}

export function useSmsCampaign(id?: string) {
  const { orgId } = useAuth()

  return useQuery({
    queryKey: ['sms-campaign', orgId, id],
    enabled: !!orgId && !!id,
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('sms_campaigns')
        .select('*')
        .eq('org_id', orgId) // 🔒 Фильтрация по организации
        .eq('id', id)
        .single()

      if (error) throw error
      return data as SmsCampaign
    },
  })
}

export function useSmsMessages(campaignId?: string) {
  const { orgId } = useAuth()

  return useQuery({
    queryKey: ['sms-messages', orgId, campaignId],
    enabled: !!orgId && !!campaignId,
    queryFn: async () => {
      if (!campaignId) return []

      // Сначала проверяем, что кампания принадлежит нашей организации
      const { data: campaign, error: campError } = await supabase
        .from('sms_campaigns')
        .select('org_id')
        .eq('id', campaignId)
        .eq('org_id', orgId) // 🔒 Проверка доступа
        .single()

      if (campError || !campaign) {
        throw new Error('Campaign not found or access denied')
      }

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
        .eq('org_id', orgId) // 🔒 Дополнительная фильтрация
        .order('sent_at', { ascending: false })

      if (error) throw error
      return data as any[]
    },
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
  const { orgId } = useAuth()

  return useQuery({
    queryKey: ['recipients-count', orgId, filterType, filterValue],
    enabled: !!orgId && !!filterType,
    queryFn: async () => {
      if (filterType === 'all') {
        const { count, error } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId) // 🔒 Фильтрация по организации
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
          .eq('org_id', orgId) // 🔒 Фильтрация по организации
          .not('phone', 'is', null)
          .or(`last_visit.is.null,last_visit.lt.${cutoffDate.toISOString()}`)

        if (error) throw error
        return count || 0
      }

      return 0
    },
  })
}
