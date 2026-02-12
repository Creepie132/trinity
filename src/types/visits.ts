// Unified Visit type for entire application
export interface Visit {
  id: string
  org_id?: string
  client_id: string
  service_type: string
  service?: string // Legacy field, kept for compatibility
  scheduled_at: string
  duration_minutes?: number
  price?: number
  status: string
  notes?: string | null
  created_at?: string
  updated_at?: string
  clients?: {
    first_name: string
    last_name: string
    phone?: string
    email?: string
  }
}
