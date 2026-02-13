// ================================================
// TRINITY CRM - Services & Care Instructions Types
// Version: 2.25.0
// ================================================

/**
 * Service (услуга организации)
 */
export interface Service {
  id: string
  org_id: string
  name: string
  name_ru?: string
  price?: number
  duration_minutes: number
  color: string
  is_active: boolean
  created_at: string
}

/**
 * Care Instruction (инструкция по уходу)
 */
export interface CareInstruction {
  id: string
  org_id: string
  service_id?: string
  title: string
  content: string
  is_active: boolean
  created_at: string
  
  // Joined data
  services?: Service
}

/**
 * Create Service DTO
 */
export interface CreateServiceDTO {
  name: string
  name_ru?: string
  price?: number
  duration_minutes?: number
  color?: string
}

/**
 * Update Service DTO
 */
export interface UpdateServiceDTO {
  name?: string
  name_ru?: string
  price?: number
  duration_minutes?: number
  color?: string
  is_active?: boolean
}

/**
 * Create Care Instruction DTO
 */
export interface CreateCareInstructionDTO {
  service_id?: string
  title: string
  content: string
}

/**
 * Update Care Instruction DTO
 */
export interface UpdateCareInstructionDTO {
  service_id?: string
  title?: string
  content?: string
  is_active?: boolean
}
