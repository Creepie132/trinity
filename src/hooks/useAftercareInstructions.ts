import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AftercareInstruction, CreateAftercareInstructionDTO, UpdateAftercareInstructionDTO } from '@/types/aftercare'

export function useAftercareInstructions() {
  return useQuery({
    queryKey: ['aftercare-instructions'],
    queryFn: async () => {
      const response = await fetch('/api/aftercare-instructions')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch aftercare instructions')
      }
      const data = await response.json()
      return data.instructions as AftercareInstruction[]
    },
  })
}

export function useCreateAftercareInstruction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (instruction: CreateAftercareInstructionDTO) => {
      const response = await fetch('/api/aftercare-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instruction),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create aftercare instruction')
      }

      const data = await response.json()
      return data.instruction as AftercareInstruction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aftercare-instructions'] })
    },
  })
}

export function useUpdateAftercareInstruction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateAftercareInstructionDTO }) => {
      const response = await fetch(`/api/aftercare-instructions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update aftercare instruction')
      }

      const result = await response.json()
      return result.instruction as AftercareInstruction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aftercare-instructions'] })
    },
  })
}

export function useDeleteAftercareInstruction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/aftercare-instructions/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete aftercare instruction')
      }

      const data = await response.json()
      return data.instruction as AftercareInstruction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aftercare-instructions'] })
    },
  })
}
