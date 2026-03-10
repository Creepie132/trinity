import { Client } from './clients'

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  org_id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  due_date?: string
  client_id?: string
  assigned_to?: string
  created_at: string
  updated_at: string
  
  // Joined data
  client?: Pick<Client, 'id' | 'first_name' | 'last_name' | 'phone'>
}

export interface CreateTaskDTO {
  title: string
  description?: string
  status?: TaskStatus
  priority: TaskPriority
  due_date?: string
  client_id?: string
  assigned_to?: string
}

export interface UpdateTaskDTO {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string
  client_id?: string
  assigned_to?: string
}