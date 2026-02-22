// Visit Service (additional service added to visit)
export interface VisitService {
  id: string
  visit_id: string
  service_id?: string
  service_name: string
  service_name_ru?: string
  price: number
  duration_minutes: number
  created_at: string
}

// DTO for creating visit service
export interface CreateVisitServiceDTO {
  visit_id: string
  service_id?: string
  service_name: string
  service_name_ru?: string
  price: number
  duration_minutes: number
}

// Unified Visit type for entire application
export interface Visit {
  id: string
  org_id?: string
  client_id: string
  service_type: string // Legacy field - will be deprecated in favor of service_id
  service_id?: string // New field - FK to services table
  service?: string // Legacy field, kept for compatibility
  scheduled_at: string
  started_at?: string // When visit actually started (in_progress)
  duration_minutes?: number
  price?: number
  status: string
  notes?: string | null
  source?: string // Source of visit: 'manual', 'online_booking', etc.
  staff_user_id?: string // Staff member who created the visit
  created_at?: string
  updated_at?: string
  clients?: {
    first_name: string
    last_name: string
    phone?: string
    email?: string
  }
  services?: {
    id: string
    name: string
    name_ru: string
    price: number
    duration_minutes: number
    color: string
    description?: string | null
    description_ru?: string | null
  }
  visit_services?: VisitService[] // Additional services
}
