export interface ProposalItem {
  name: string
  volume?: string // '250ml' — если пусто, не выводится
  desc?: string // описание — если пусто, не выводится
  qty: number
  price: number
}

export interface ProposalDiscount {
  type: 'percent' | 'amount'
  value: number
}

export interface ProposalParty {
  name: string
  email?: string
  phone?: string
  website?: string
  address?: string
  org?: string
  logo?: string // URL из Supabase Storage (seller only)
}

export interface ProposalData {
  docNumber: string
  issueDate: string // 'DD/MM/YYYY'
  validDays?: number // 30 → показать срок действия; 0/null → скрыть бейдж
  seller: ProposalParty
  buyer: ProposalParty
  items: ProposalItem[]
  discount?: ProposalDiscount
  vat?: number // 0 = не показывать, 17 = 17%
  notes?: string // пусто → блок скрыт
}
