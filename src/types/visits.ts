import { Client } from './clients'

export interface Visit {
  id: string
  client_id: string
  start_time: string
  end_time: string
  services: string[]
  notes?: string
  status: 'scheduled' | 'completed' | 'cancelled'
  created_at: string
  org_id: string
  client?: Pick<Client, 'id' | 'first_name' | 'last_name' | 'phone'>
}

export type VisitInput = Omit<Visit, 'id' | 'created_at' | 'client'>