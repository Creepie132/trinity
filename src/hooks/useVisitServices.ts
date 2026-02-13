import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { VisitService, CreateVisitServiceDTO } from '@/types/visits'

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
      return data.services as VisitService[]
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

      const data = await response.json()
      return data.service as VisitService
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

      const data = await response.json()
      return data.visit
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      queryClient.invalidateQueries({ queryKey: ['visit-services', visitId] })
    },
  })
}
