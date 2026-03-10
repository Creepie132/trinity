import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Visit, VisitInput } from '@/types/visits'
import { supabase } from '@/lib/supabase'

export const useVisits = () => {
  const queryClient = useQueryClient()

  const getVisits = async (): Promise<Visit[]> => {
    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        client:clients (
          id,
          first_name,
          last_name,
          phone
        )
      `)
      .order('start_time', { ascending: false })

    if (error) throw error
    return data
  }

  const visits = useQuery({
    queryKey: ['visits'],
    queryFn: getVisits
  })

  const createVisit = useMutation({
    mutationFn: async (visit: VisitInput) => {
      const { data, error } = await supabase
        .from('visits')
        .insert(visit)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] })
    }
  })

  const updateVisit = useMutation({
    mutationFn: async ({ id, ...visit }: VisitInput & { id: string }) => {
      const { data, error } = await supabase
        .from('visits')
        .update(visit)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] })
    }
  })

  const deleteVisit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] })
    }
  })

  return {
    visits: visits.data ?? [],
    isLoading: visits.isLoading,
    isError: visits.isError,
    error: visits.error,
    createVisit: createVisit.mutate,
    updateVisit: updateVisit.mutate,
    deleteVisit: deleteVisit.mutate,
    isPending: createVisit.isPending || updateVisit.isPending || deleteVisit.isPending
  }
}