import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'

export interface OrgTemplates {
  whatsapp_template: string
  sms_template: string
}

export function useOrgTemplates() {
  const { orgId } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery<OrgTemplates>({
    queryKey: ['org-templates', orgId],
    queryFn: async () => {
      const res = await fetch('/api/org-templates')
      if (!res.ok) throw new Error('Failed to load templates')
      return res.json()
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 min — templates change rarely
  })

  const mutation = useMutation({
    mutationFn: async (update: Partial<OrgTemplates>) => {
      const res = await fetch('/api/org-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
      if (!res.ok) throw new Error('Failed to save templates')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-templates', orgId] })
    },
  })

  return {
    templates: query.data,
    isLoading: query.isLoading,
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
  }
}
