import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { VisitService, CreateVisitServiceDTO } from '@/types/visits'

// NOTE: useRealtimeSync removed — centralised in GlobalRealtimeSync (ClientProviders.tsx)

export function useVisitServices(visitId: string) {
  return useQuery({
    queryKey: ['visit-services', visitId],
    queryFn: async () => {
      const response = await fetch(`/api/visits/${visitId}/services`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch visit services')
      }
      const data = await response.json()
      return (Array.isArray(data) ? data : data.services ?? []) as VisitService[]
    },
    enabled: !!visitId,
  })
}

export function useAddVisitService(visitId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (service: CreateVisitServiceDTO) => {
      const response = await fetch(`/api/visits/${visitId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add service')
      }
      return (await response.json()).service as VisitService
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-services', visitId] })
      queryClient.invalidateQueries({ queryKey: ['visits'] })
    },
  })
}

export function useRemoveVisitService(visitId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const response = await fetch(`/api/visits/${visitId}/services/${serviceId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove service')
      }
      return { serviceId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-services', visitId] })
      queryClient.invalidateQueries({ queryKey: ['visits'] })
    },
  })
}

export function useUpdateVisitServiceQty(visitId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ serviceId, quantity }: { serviceId: string; quantity: number }) => {
      const response = await fetch(`/api/visits/${visitId}/services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update quantity')
      }
      return (await response.json()).service as VisitService
    },
    // Optimistic update — меняем в кэше немедленно
    onMutate: async ({ serviceId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['visit-services', visitId] })
      const prev = queryClient.getQueryData<VisitService[]>(['visit-services', visitId])
      queryClient.setQueryData<VisitService[]>(['visit-services', visitId], old =>
        (old ?? []).map(vs => vs.id === serviceId ? { ...vs, quantity } : vs)
      )
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['visit-services', visitId], context.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-services', visitId] })
    },
  })
}

export function useUpdateVisitStatus(visitId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (status: 'in_progress' | 'completed' | 'cancelled') => {
      const response = await fetch(`/api/visits/${visitId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update status')
      }
      return (await response.json()).visit
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      queryClient.invalidateQueries({ queryKey: ['visit-services', visitId] })
    },
  })
}
