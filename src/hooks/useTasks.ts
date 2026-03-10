import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Task, CreateTaskDTO, UpdateTaskDTO } from '@/types/tasks'
import { supabase } from '@/lib/supabase'

export const useTasks = () => {
  const queryClient = useQueryClient()

  const getTasks = async (): Promise<Task[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        client:clients (
          id,
          first_name,
          last_name,
          phone
        )
      `)
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  const tasks = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks
  })

  const createTask = useMutation({
    mutationFn: async (task: CreateTaskDTO) => {
      // Get user's org_id
      const { data: { user } } = await supabase.auth.getUser()
      const org_id = user?.user_metadata?.org_id

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          org_id,
          status: task.status || 'pending'
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  const updateTask = useMutation({
    mutationFn: async ({ id, ...task }: UpdateTaskDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(task)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  // Group tasks by status
  const groupedTasks = tasks.data?.reduce((groups, task) => {
    const status = task.status
    if (!groups[status]) groups[status] = []
    groups[status].push(task)
    return groups
  }, {} as Record<string, Task[]>) || {}

  return {
    tasks: tasks.data ?? [],
    groupedTasks,
    isLoading: tasks.isLoading,
    isError: tasks.isError,
    error: tasks.error,
    createTask: createTask.mutate,
    updateTask: updateTask.mutate,
    deleteTask: deleteTask.mutate,
    isPending: createTask.isPending || updateTask.isPending || deleteTask.isPending
  }
}