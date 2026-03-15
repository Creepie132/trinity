import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface OrgTemplates {
  whatsapp_template: string
  sms_template: string
}

// Stable initial data — same on server and client, prevents hydration mismatch
const EMPTY_TEMPLATES: OrgTemplates = {
  whatsapp_template: '',
  sms_template: '',
}

export function useOrgTemplates() {
  const queryClient = useQueryClient()

  const query = useQuery<OrgTemplates>({
    queryKey: ['org-templates'],
    queryFn: async () => {
      const res = await fetch('/api/org-templates')
      if (!res.ok) throw new Error('Failed to load templates')
      return res.json()
    },
    // Always enabled — API determines org from session cookie server-side
    // No orgId dependency avoids SSR/client mismatch
    enabled: true,
    staleTime: 5 * 60 * 1000,
    // Same initial value on server and client — no hydration mismatch
    initialData: EMPTY_TEMPLATES,
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
      queryClient.invalidateQueries({ queryKey: ['org-templates'] })
    },
  })

  // Return null-safe: empty string template = no text added to WhatsApp URL
  const templates = query.data ?? EMPTY_TEMPLATES

  return {
    templates,
    isLoading: query.isLoading,
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
  }
}
