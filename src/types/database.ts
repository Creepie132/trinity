export interface Client {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  address: string | null
  date_of_birth: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Visit {
  id: string
  client_id: string
  visit_date: string
  service_description: string
  amount: number
  notes: string | null
  created_at: string
}

export interface Payment {
  id: string
  client_id: string
  visit_id: string | null
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_method: string | null
  payment_link: string | null
  transaction_id: string | null
  provider: string
  paid_at: string | null
  created_at: string
}

export interface SmsCampaign {
  id: string
  name: string
  message: string
  filter_type: 'all' | 'single' | 'inactive_days'
  filter_value: string | null
  recipients_count: number
  sent_count: number
  failed_count: number
  status: 'draft' | 'sending' | 'completed' | 'failed'
  created_at: string
  sent_at: string | null
}

export interface SmsMessage {
  id: string
  campaign_id: string
  client_id: string
  phone: string
  message: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  error: string | null
  sent_at: string | null
}

export interface ClientSummary {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  date_of_birth: string | null
  address: string | null
  notes: string | null
  created_at: string
  last_visit: string | null
  total_visits: number
  total_paid: number
}

// =============================================
// NEW TYPES (v2.0 - Multi-tenancy)
// =============================================

export interface Organization {
  id: string
  name: string
  email: string | null
  phone: string | null
  category: 'salon' | 'carwash' | 'clinic' | 'restaurant' | 'gym' | 'other'
  plan: 'basic' | 'pro' | 'enterprise'
  is_active: boolean
  features: {
    sms: boolean
    payments: boolean
    analytics: boolean
    subscriptions?: boolean
  }
  billing_status: 'trial' | 'paid' | 'overdue' | 'cancelled'
  billing_due_date: string | null
  created_at: string
}

export interface OrgUser {
  id: string
  org_id: string
  user_id: string | null
  email: string
  role: 'owner' | 'admin' | 'staff'
  invited_at: string
  joined_at: string | null
}

export interface AdminUser {
  id: string
  user_id: string
  email: string
}

export interface AdCampaign {
  id: string
  advertiser_name: string
  banner_url: string
  link_url: string
  target_categories: string[]
  start_date: string
  end_date: string
  is_active: boolean
  clicks: number
  impressions: number
  created_at: string
}
