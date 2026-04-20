// prettier-ignore
// AUTO-GENERATED — do not edit manually.
// Run: supabase gen types typescript --project-id tjryzcqvsavtllahjyrj > src/types/database.ts
// Last generated: 2026-03-21 (worker_cabinet_v1 migration)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          org_id: string | null
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          org_id?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          org_id?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ad_campaigns: {
        Row: {
          advertiser_name: string
          banner_url: string
          click_url: string | null
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          start_date: string | null
          target_modules: string[] | null
        }
        Insert: {
          advertiser_name: string
          banner_url: string
          click_url?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          target_modules?: string[] | null
        }
        Update: {
          advertiser_name?: string
          banner_url?: string
          click_url?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          target_modules?: string[] | null
        }
        Relationships: []
      }
      admin_notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          org_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      booking_settings: {
        Row: {
          allow_cancel_hours: number | null
          allow_reschedule: boolean | null
          auto_confirm: boolean | null
          buffer_between_slots: number | null
          created_at: string | null
          id: string
          max_advance_days: number | null
          org_id: string
          slot_duration: number | null
          updated_at: string | null
          working_hours: Json | null
        }
        Insert: {
          allow_cancel_hours?: number | null
          allow_reschedule?: boolean | null
          auto_confirm?: boolean | null
          buffer_between_slots?: number | null
          created_at?: string | null
          id?: string
          max_advance_days?: number | null
          org_id: string
          slot_duration?: number | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Update: {
          allow_cancel_hours?: number | null
          allow_reschedule?: boolean | null
          auto_confirm?: boolean | null
          buffer_between_slots?: number | null
          created_at?: string | null
          id?: string
          max_advance_days?: number | null
          org_id?: string
          slot_duration?: number | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          confirmed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          org_id: string
          reminder_sent: boolean | null
          scheduled_at: string
          service_id: string | null
          slot_duration: number | null
          source: string | null
          staff_user_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          org_id: string
          reminder_sent?: boolean | null
          scheduled_at: string
          service_id?: string | null
          slot_duration?: number | null
          source?: string | null
          staff_user_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          reminder_sent?: boolean | null
          scheduled_at?: string
          service_id?: string | null
          slot_duration?: number | null
          source?: string | null
          staff_user_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          child_org_id: string
          created_at: string | null
          id: string
          name: string | null
          parent_org_id: string
        }
        Insert: {
          child_org_id: string
          created_at?: string | null
          id?: string
          name?: string | null
          parent_org_id: string
        }
        Update: {
          child_org_id?: string
          created_at?: string | null
          id?: string
          name?: string | null
          parent_org_id?: string
        }
        Relationships: []
      }
      // ─── PIPELINE ────────────────────────────────────────────────
      call_records: {
        Row: {
          client_id: string | null
          created_at: string
          direction: string
          duration_seconds: number
          ended_at: string | null
          id: string
          org_id: string
          phone_from: string
          phone_to: string
          provider: string | null
          provider_call_id: string | null
          recording_url: string | null
          started_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          direction: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          org_id: string
          phone_from: string
          phone_to: string
          provider?: string | null
          provider_call_id?: string | null
          recording_url?: string | null
          started_at: string
          status?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          org_id?: string
          phone_from?: string
          phone_to?: string
          provider?: string | null
          provider_call_id?: string | null
          recording_url?: string | null
          started_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      care_instructions: {
        Row: {
          content_he: string | null
          content_ru: string | null
          created_at: string | null
          id: string
          org_id: string
          service_id: string | null
          title_he: string | null
          title_ru: string | null
          updated_at: string | null
        }
        Insert: {
          content_he?: string | null
          content_ru?: string | null
          created_at?: string | null
          id?: string
          org_id: string
          service_id?: string | null
          title_he?: string | null
          title_ru?: string | null
          updated_at?: string | null
        }
        Update: {
          content_he?: string | null
          content_ru?: string | null
          created_at?: string | null
          id?: string
          org_id?: string
          service_id?: string | null
          title_he?: string | null
          title_ru?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      client_subscriptions: {
        Row: {
          client_id: string
          created_at: string | null
          end_date: string | null
          id: string
          org_id: string
          plan_id: string | null
          sessions_remaining: number | null
          sessions_total: number | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          org_id: string
          plan_id?: string | null
          sessions_remaining?: number | null
          sessions_total?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          org_id?: string
          plan_id?: string | null
          sessions_remaining?: number | null
          sessions_total?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          assigned_to: string | null
          city: string | null
          client_tags: string[]
          created_at: string | null
          date_of_birth: string | null
          description: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          loyalty_balance: number
          notes: string | null
          org_id: string
          paint_code: string | null
          phone: string
          social_links: Json
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          client_tags?: string[]
          created_at?: string | null
          date_of_birth?: string | null
          description?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          loyalty_balance?: number
          notes?: string | null
          org_id: string
          paint_code?: string | null
          phone: string
          social_links?: Json
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          client_tags?: string[]
          created_at?: string | null
          date_of_birth?: string | null
          description?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          loyalty_balance?: number
          notes?: string | null
          org_id?: string
          paint_code?: string | null
          phone?: string
          social_links?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      communication_log: {
        Row: {
          call_record_id: string | null
          client_id: string | null
          created_at: string
          deal_id: string | null
          direction: string | null
          duration_seconds: number | null
          happened_at: string
          id: string
          metadata: Json
          org_id: string
          summary: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          call_record_id?: string | null
          client_id?: string | null
          created_at?: string
          deal_id?: string | null
          direction?: string | null
          duration_seconds?: number | null
          happened_at?: string
          id?: string
          metadata?: Json
          org_id: string
          summary?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          call_record_id?: string | null
          client_id?: string | null
          created_at?: string
          deal_id?: string | null
          direction?: string | null
          duration_seconds?: number | null
          happened_at?: string
          id?: string
          metadata?: Json
          org_id?: string
          summary?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_booking_stage: boolean
          is_lost: boolean
          is_won: boolean
          name: string
          name_he: string | null
          org_id: string
          position: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_booking_stage?: boolean
          is_lost?: boolean
          is_won?: boolean
          name: string
          name_he?: string | null
          org_id: string
          position?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_booking_stage?: boolean
          is_lost?: boolean
          is_won?: boolean
          name?: string
          name_he?: string | null
          org_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_stages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_tag_assignments: {
        Row: {
          deal_id: string
          tag_id: string
        }
        Insert: {
          deal_id: string
          tag_id: string
        }
        Update: {
          deal_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_tag_assignments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "deal_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          org_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          org_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_tags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          amount: number
          assigned_to: string | null
          client_id: string | null
          created_at: string
          currency: string
          expected_close_date: string | null
          id: string
          last_contact_at: string | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          org_id: string
          rejection_category: string | null
          rejection_reason: string | null
          source: string | null
          stage_id: string
          stage_updated_at: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          expected_close_date?: string | null
          id?: string
          last_contact_at?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          org_id: string
          rejection_category?: string | null
          rejection_reason?: string | null
          source?: string | null
          stage_id: string
          stage_updated_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          expected_close_date?: string | null
          id?: string
          last_contact_at?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          org_id?: string
          rejection_category?: string | null
          rejection_reason?: string | null
          source?: string | null
          stage_id?: string
          stage_updated_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "deal_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_registrations: {
        Row: {
          business_name: string | null
          business_type: string | null
          completed_at: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          org_id: string | null
          phone: string
          source: string | null
          status: string | null
        }
        Insert: {
          business_name?: string | null
          business_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          org_id?: string | null
          phone: string
          source?: string | null
          status?: string | null
        }
        Update: {
          business_name?: string | null
          business_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          org_id?: string | null
          phone?: string
          source?: string | null
          status?: string | null
        }
        Relationships: []
      }
      demo_sessions: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          org_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          org_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          org_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      impersonation_sessions: {
        Row: {
          admin_user_id: string
          created_at: string | null
          ended_at: string | null
          id: string
          org_id: string
          reason: string | null
          target_user_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          org_id: string
          reason?: string | null
          target_user_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          org_id?: string
          reason?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          org_id: string
          product_id: string
          quantity: number
          reference_id: string | null
          type: string
          unit_price: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          org_id: string
          product_id: string
          quantity: number
          reference_id?: string | null
          type: string
          unit_price?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          product_id?: string
          quantity?: number
          reference_id?: string | null
          type?: string
          unit_price?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          branch_id: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          invited_by_phone: string | null
          message: string | null
          org_id: string | null
          status: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          branch_id?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          invited_by_phone?: string | null
          message?: string | null
          org_id?: string | null
          status?: string | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          branch_id?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          invited_by_phone?: string | null
          message?: string | null
          org_id?: string | null
          status?: string | null
          token?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          client_id: string
          created_at: string | null
          description: string | null
          id: string
          org_id: string
          points: number
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          org_id: string
          points: number
          type: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          org_id?: string
          points?: number
          type?: string
        }
        Relationships: []
      }
      loyalty_settings: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          org_id: string
          points_per_shekel: number | null
          reward_threshold: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          org_id: string
          points_per_shekel?: number | null
          reward_threshold?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          org_id?: string
          points_per_shekel?: number | null
          reward_threshold?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string | null
          variables: string[] | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id?: string | null
          variables?: string[] | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      module_pricing: {
        Row: {
          base_price: number | null
          created_at: string | null
          currency: string | null
          description_en: string | null
          description_he: string | null
          id: string
          is_active: boolean | null
          module_key: string
          name_en: string | null
          name_he: string | null
          price_per_user: number | null
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string | null
          currency?: string | null
          description_en?: string | null
          description_he?: string | null
          id?: string
          is_active?: boolean | null
          module_key: string
          name_en?: string | null
          name_he?: string | null
          price_per_user?: number | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          created_at?: string | null
          currency?: string | null
          description_en?: string | null
          description_he?: string | null
          id?: string
          is_active?: boolean | null
          module_key?: string
          name_en?: string | null
          name_he?: string | null
          price_per_user?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          org_id: string
          priority: string
          push_sent: boolean | null
          push_sent_at: string | null
          reference_id: string | null
          scheduled_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          org_id: string
          priority?: string
          push_sent?: boolean | null
          push_sent_at?: string | null
          reference_id?: string | null
          scheduled_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          org_id?: string
          priority?: string
          push_sent?: boolean | null
          push_sent_at?: string | null
          reference_id?: string | null
          scheduled_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      org_integrations: {
        Row: {
          created_at: string | null
          id: string
          meta: Json | null
          org_id: string
          provider: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          org_id: string
          provider: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          org_id?: string
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      org_receipt_settings: {
        Row: {
          business_number: string | null
          created_at: string | null
          footer_text: string | null
          id: string
          logo_url: string | null
          org_id: string
          provider: string | null
          provider_settings: Json | null
          updated_at: string | null
        }
        Insert: {
          business_number?: string | null
          created_at?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          org_id: string
          provider?: string | null
          provider_settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          business_number?: string | null
          created_at?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          org_id?: string
          provider?: string | null
          provider_settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      org_users: {
        Row: {
          avatar_url: string | null
          email: string
          id: string
          invited_at: string | null
          joined_at: string | null
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          email: string
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          org_id: string
          role: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          email?: string
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          name: string
          plan: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          name: string
          plan?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          name?: string
          plan?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      outbound_queue: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          message: string
          org_id: string | null
          phone: string
          processed_at: string | null
          retry_count: number | null
          scheduled_at: string | null
          status: string | null
          template_id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          message: string
          org_id?: string | null
          phone: string
          processed_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          status?: string | null
          template_id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          message?: string
          org_id?: string | null
          phone?: string
          processed_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          status?: string | null
          template_id?: string | null
          type?: string | null
        }
        Relationships: []
      }
      payment_attempts: {
        Row: {
          attempt_number: number
          created_at: string | null
          error_message: string | null
          id: string
          org_id: string
          provider_response: Json | null
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string | null
          error_message?: string | null
          id?: string
          org_id: string
          provider_response?: Json | null
          status: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          attempt_number?: number
          created_at?: string | null
          error_message?: string | null
          id?: string
          org_id?: string
          provider_response?: Json | null
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string | null
          id: string
          method: string | null
          notes: string | null
          org_id: string
          status: string | null
          updated_at: string | null
          visit_id: string | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          org_id: string
          status?: string | null
          updated_at?: string | null
          visit_id?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          org_id?: string
          status?: string | null
          updated_at?: string | null
          visit_id?: string | null
        }
        Relationships: []
      }
      pricing_config: {
        Row: {
          config: Json
          id: string
          updated_at: string | null
        }
        Insert: {
          config: Json
          id?: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          cost_price: number | null
          created_at: string | null
          id: string
          min_stock: number | null
          name: string
          org_id: string
          price: number | null
          sku: string | null
          stock: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          min_stock?: number | null
          name: string
          org_id: string
          price?: number | null
          sku?: string | null
          stock?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          min_stock?: number | null
          name?: string
          org_id?: string
          price?: number | null
          sku?: string | null
          stock?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          keys: Json
          org_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          keys: Json
          org_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          keys?: Json
          org_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          id: string
          org_id: string
          product_id: string | null
          quantity: number
          sale_id: string
          service_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          org_id: string
          product_id?: string | null
          quantity?: number
          sale_id: string
          service_id?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          id?: string
          org_id?: string
          product_id?: string | null
          quantity?: number
          sale_id?: string
          service_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: []
      }
      sales: {
        Row: {
          client_id: string | null
          created_at: string
          deal_id: string | null
          id: string
          notes: string | null
          org_id: string
          paid_amount: number
          payment_id: string | null
          receipt_sent: boolean
          sale_date: string
          staff_id: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          notes?: string | null
          org_id: string
          paid_amount?: number
          payment_id?: string | null
          receipt_sent?: boolean
          sale_date?: string
          staff_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          paid_amount?: number
          payment_id?: string | null
          receipt_sent?: boolean
          sale_date?: string
          staff_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      sales_plans: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          notes: string | null
          org_id: string
          period_month: number
          period_year: number
          target_amount: number
          target_deals: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          org_id: string
          period_month: number
          period_year: number
          target_amount?: number
          target_deals?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          org_id?: string
          period_month?: number
          period_year?: number
          target_amount?: number
          target_deals?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string
          price: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id: string
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sms_campaigns: {
        Row: {
          content: string
          created_at: string | null
          failed_count: number | null
          filter_type: string
          filter_value: string | null
          id: string
          message: string
          name: string
          org_id: string
          recipients_count: number | null
          sent_at: string | null
          sent_count: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string
          created_at?: string | null
          failed_count?: number | null
          filter_type: string
          filter_value?: string | null
          id?: string
          message: string
          name: string
          org_id: string
          recipients_count?: number | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          failed_count?: number | null
          filter_type?: string
          filter_value?: string | null
          id?: string
          message?: string
          name?: string
          org_id?: string
          recipients_count?: number | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          campaign_id: string | null
          client_id: string | null
          content: string
          created_at: string | null
          id: string
          org_id: string
          phone: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          campaign_id?: string | null
          client_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          org_id: string
          phone: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string | null
          client_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          org_id?: string
          phone?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          can_book_other_branches: boolean | null
          can_delete_deals: boolean
          can_export_clients: boolean
          can_manage_clients: boolean | null
          can_manage_deals: boolean
          can_manage_visits: boolean | null
          can_transfer_inventory: boolean | null
          can_view_all_clients: boolean
          can_view_all_reports: boolean | null
          can_view_reports: boolean
          created_at: string | null
          id: string
          org_id: string
          phone_mask_enabled: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_book_other_branches?: boolean | null
          can_delete_deals?: boolean
          can_export_clients?: boolean
          can_manage_clients?: boolean | null
          can_manage_deals?: boolean
          can_manage_visits?: boolean | null
          can_transfer_inventory?: boolean | null
          can_view_all_clients?: boolean
          can_view_all_reports?: boolean | null
          can_view_reports?: boolean
          created_at?: string | null
          id?: string
          org_id: string
          phone_mask_enabled?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_book_other_branches?: boolean | null
          can_delete_deals?: boolean
          can_export_clients?: boolean
          can_manage_clients?: boolean | null
          can_manage_deals?: boolean
          can_manage_visits?: boolean | null
          can_transfer_inventory?: boolean | null
          can_view_all_clients?: boolean
          can_view_all_reports?: boolean | null
          can_view_reports?: boolean
          created_at?: string | null
          id?: string
          org_id?: string
          phone_mask_enabled?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_billing_log: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          metadata: Json | null
          org_id: string
          period_end: string | null
          period_start: string | null
          plan_id: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          period_end?: string | null
          period_start?: string | null
          plan_id?: string | null
          status: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          period_end?: string | null
          period_start?: string | null
          plan_id?: string | null
          status?: string
        }
        Relationships: []
      }
      subscription_charges: {
        Row: {
          amount: number
          charged_at: string | null
          created_at: string | null
          currency: string | null
          id: string
          org_id: string
          status: string | null
          subscription_id: string | null
        }
        Insert: {
          amount: number
          charged_at?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          org_id: string
          status?: string | null
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          charged_at?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          org_id?: string
          status?: string | null
          subscription_id?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
        }
        Relationships: []
      }
      support_notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          archived_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          auto_type: string | null
          completed_at: string | null
          completed_by: string | null
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          is_auto: boolean | null
          is_read: boolean | null
          org_id: string
          payment_id: string | null
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
          visit_id: string | null
          client_id: string | null
        }
        Insert: {
          archived_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          auto_type?: string | null
          completed_at?: string | null
          completed_by?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_auto?: boolean | null
          is_read?: boolean | null
          org_id: string
          payment_id?: string | null
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          visit_id?: string | null
          client_id?: string | null
        }
        Update: {
          archived_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          auto_type?: string | null
          completed_at?: string | null
          completed_by?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_auto?: boolean | null
          is_read?: boolean | null
          org_id?: string
          payment_id?: string | null
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          visit_id?: string | null
          client_id?: string | null
        }
        Relationships: []
      }
      transfer_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          from_org_id: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          requested_by: string | null
          status: string | null
          to_org_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          from_org_id: string
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          requested_by?: string | null
          status?: string | null
          to_org_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          from_org_id?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          requested_by?: string | null
          status?: string | null
          to_org_id?: string
        }
        Relationships: []
      }
      user_active_branch: {
        Row: {
          active_org_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_org_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_org_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          client_id: string
          created_at: string | null
          deal_id: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          org_id: string
          price: number | null
          quantity: number
          scheduled_at: string
          service_id: string | null
          service_type: string
          source: string | null
          staff_user_id: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          deal_id?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          org_id: string
          price?: number | null
          quantity?: number
          scheduled_at: string
          service_id?: string | null
          service_type: string
          source?: string | null
          staff_user_id?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          deal_id?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          org_id?: string
          price?: number | null
          quantity?: number
          scheduled_at?: string
          service_id?: string | null
          service_type?: string
          source?: string | null
          staff_user_id?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wa_conversations: {
        Row: {
          client_id: string | null
          client_phone: string
          created_at: string | null
          id: string
          last_message_at: string | null
          org_id: string
          status: string | null
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          client_phone: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          org_id: string
          status?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          client_phone?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          org_id?: string
          status?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wa_integrations: {
        Row: {
          access_token: string | null
          created_at: string | null
          id: string
          org_id: string
          phone_number_id: string | null
          provider: string | null
          updated_at: string | null
          verify_token: string | null
          waba_id: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          org_id: string
          phone_number_id?: string | null
          provider?: string | null
          updated_at?: string | null
          verify_token?: string | null
          waba_id?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          org_id?: string
          phone_number_id?: string | null
          provider?: string | null
          updated_at?: string | null
          verify_token?: string | null
          waba_id?: string | null
        }
        Relationships: []
      }
      wa_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          direction: string | null
          id: string
          media_url: string | null
          message_type: string | null
          org_id: string
          provider_message_id: string | null
          status: string | null
          timestamp: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          direction?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          org_id: string
          provider_message_id?: string | null
          status?: string | null
          timestamp?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          direction?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          org_id?: string
          provider_message_id?: string | null
          status?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      wa_send_log: {
        Row: {
          client_id: string | null
          created_at: string | null
          error: string | null
          id: string
          message: string | null
          org_id: string | null
          phone: string
          provider_message_id: string | null
          status: string | null
          template_id: string | null
          trigger_type: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          message?: string | null
          org_id?: string | null
          phone: string
          provider_message_id?: string | null
          status?: string | null
          template_id?: string | null
          trigger_type?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          message?: string | null
          org_id?: string | null
          phone?: string
          provider_message_id?: string | null
          status?: string | null
          template_id?: string | null
          trigger_type?: string | null
        }
        Relationships: []
      }
      wa_trigger_settings: {
        Row: {
          created_at: string | null
          delay_minutes: number | null
          id: string
          is_enabled: boolean | null
          org_id: string
          template_id: string | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_enabled?: boolean | null
          org_id: string
          template_id?: string | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_enabled?: boolean | null
          org_id?: string
          template_id?: string | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      work_shifts: {
        Row: {
          created_at: string | null
          ended_at: string | null
          id: string
          notes: string | null
          org_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          org_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      worker_dashboard_settings: {
        Row: {
          created_at: string
          id: string
          org_id: string
          updated_at: string
          user_id: string
          widgets_config: Json
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          updated_at?: string
          user_id: string
          widgets_config?: Json
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          updated_at?: string
          user_id?: string
          widgets_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "worker_dashboard_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_all_clients: {
        Args: { p_org_id: string }
        Returns: boolean
      }
      is_org_admin: {
        Args: { p_org_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ─── Convenience type aliases ─────────────────────────────────────────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// ─── Shorthand types for worker cabinet ──────────────────────────────────────

export type Deal          = Tables<'deals'>
export type DealStage     = Tables<'deal_stages'>
export type DealTag       = Tables<'deal_tags'>
export type SalesPlan     = Tables<'sales_plans'>
export type CallRecord    = Tables<'call_records'>
export type CommLog       = Tables<'communication_log'>
export type DashSettings  = Tables<'worker_dashboard_settings'>

// Deal with joined stage (used in Pipeline view)
export type DealWithStage = Deal & { stage: DealStage; tags: DealTag[] }

// Rejection categories (mirrors DB CHECK constraint)
export type RejectionCategory = 'price' | 'competitor' | 'timing' | 'no_need' | 'other'

// Deal sources (mirrors DB CHECK constraint)
export type DealSource = 'whatsapp' | 'instagram' | 'website' | 'referral' | 'cold_call' | 'other'

// Call directions / statuses
export type CallDirection = 'inbound' | 'outbound'
export type CallStatus    = 'completed' | 'missed' | 'busy' | 'failed'

// Communication types
export type CommType = 'call' | 'whatsapp' | 'email' | 'sms' | 'meeting' | 'note'

// Client base type
// NOTE: preferred_languages was added by migration after DB types were last regenerated.
// Merged manually here until `supabase gen types typescript` is re-run.
export type Client = Tables<'clients'> & {
  preferred_languages?: string[]
}

// Client summary — shape returned by GET /api/clients/summary
// Includes a subset of client fields + aggregated visit/payment stats
export type ClientSummary = {
  id:             string
  first_name:     string
  last_name:      string
  phone:          string
  email:          string | null
  address:        string | null
  city:           string | null
  date_of_birth:  string | null
  notes:          string | null
  description:    string | null
  paint_code:     string | null
  loyalty_balance: number
  created_at:     string
  org_id:         string
  assigned_to:    string | null
  total_visits:   number
  last_visit:     string | null
  total_paid:     number
}

// Ad campaign type
export type AdCampaign   = Tables<'ad_campaigns'>

// SMS types
export type SmsCampaign  = Tables<'sms_campaigns'>
export type SmsMessage   = Tables<'sms_messages'>

// Payment type
export type Payment      = Tables<'payments'>
