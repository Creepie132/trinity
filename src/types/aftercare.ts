export interface AftercareInstruction {
  id: string
  org_id: string
  title: string
  title_ru?: string | null
  content: string
  content_ru?: string | null
  created_at: string
  updated_at: string
}

export interface CreateAftercareInstructionDTO {
  title: string
  title_ru?: string
  content: string
  content_ru?: string
}

export interface UpdateAftercareInstructionDTO {
  title?: string
  title_ru?: string
  content?: string
  content_ru?: string
}
