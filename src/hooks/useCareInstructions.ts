import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CareInstruction, CreateCareInstructionDTO, UpdateCareInstructionDTO } from '@/types/services'

export function useCareInstructions() {
  return useQuery({
    queryKey: ['care-instructions'],
    queryFn: async () => {
      const response = await fetch('/api/care-instructions')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch care instructions')
      }
      const data = await response.json()
      return data.instructions as CareInstruction[]
    },
  })
}

export function useCreateCareInstruction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (instruction: CreateCareInstructionDTO) => {
      const response = await fetch('/api/care-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instruction),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create care instruction')
      }

      const data = await response.json()
      return data.instruction as CareInstruction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-instructions'] })
    },
  })
}

export function useUpdateCareInstruction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateCareInstructionDTO }) => {
      const response = await fetch(`/api/care-instructions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update care instruction')
      }

      const result = await response.json()
      return result.instruction as CareInstruction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-instructions'] })
    },
  })
}

export function useDeleteCareInstruction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/care-instructions/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete care instruction')
      }

      const data = await response.json()
      return data.instruction as CareInstruction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-instructions'] })
    },
  })
}
