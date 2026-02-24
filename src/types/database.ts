/**
 * Supabase database types.
 * Generated via: supabase gen types typescript --project-id <id> > src/types/database.ts
 * After migrations are applied, replace this file with the generated output.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          plan: string
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan?: string
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          plan?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tenant_members: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          is_active: boolean
          invited_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          is_active?: boolean
          invited_by?: string | null
          created_at?: string
        }
        Update: {
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          is_active?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          oab_number: string | null
          oab_state: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          oab_number?: string | null
          oab_state?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          email?: string | null
          oab_number?: string | null
          oab_state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      monitored_cases: {
        Row: {
          id: string
          tenant_id: string
          cnj: string
          tribunal: string | null
          provider: string | null
          monitor_enabled: boolean
          last_checked_at: string | null
          last_movement_hash: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          cnj: string
          tribunal?: string | null
          provider?: string | null
          monitor_enabled?: boolean
          last_checked_at?: string | null
          last_movement_hash?: string | null
          created_at?: string
        }
        Update: {
          tribunal?: string | null
          provider?: string | null
          monitor_enabled?: boolean
          last_checked_at?: string | null
          last_movement_hash?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          id: string
          tenant_id: string
          member_id: string
          case_id: string
          type: 'new_movement' | 'deadline_approaching' | 'status_change'
          title: string
          body: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          member_id: string
          case_id: string
          type: 'new_movement' | 'deadline_approaching' | 'status_change'
          title: string
          body: string
          read?: boolean
          created_at?: string
        }
        Update: {
          read?: boolean
        }
        Relationships: []
      }
      webhook_endpoints: {
        Row: {
          id: string
          tenant_id: string
          name: string
          url: string
          secret: string
          events: string[]
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          url: string
          secret: string
          events?: string[]
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          url?: string
          secret?: string
          events?: string[]
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          id: string
          tenant_id: string
          endpoint_id: string
          alert_id: string | null
          event_type: string
          payload: Json
          status: 'pending' | 'success' | 'failed' | 'dead_letter'
          attempt_count: number
          next_attempt_at: string | null
          last_response_status: number | null
          last_response_body: string | null
          created_at: string
          delivered_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          endpoint_id: string
          alert_id?: string | null
          event_type: string
          payload: Json
          status?: 'pending' | 'success' | 'failed' | 'dead_letter'
          attempt_count?: number
          next_attempt_at?: string | null
          last_response_status?: number | null
          last_response_body?: string | null
          created_at?: string
          delivered_at?: string | null
        }
        Update: {
          status?: 'pending' | 'success' | 'failed' | 'dead_letter'
          attempt_count?: number
          next_attempt_at?: string | null
          last_response_status?: number | null
          last_response_body?: string | null
          delivered_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          tenant_id: string
          plan: string
          stripe_subscription_id: string | null
          stripe_current_period_end: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          plan?: string
          stripe_subscription_id?: string | null
          stripe_current_period_end?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          plan?: string
          stripe_subscription_id?: string | null
          stripe_current_period_end?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_tenant_usage: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
    }
    Enums: {
      member_role: 'owner' | 'admin' | 'member' | 'viewer'
      alert_type: 'new_movement' | 'deadline_approaching' | 'status_change'
      delivery_status: 'pending' | 'success' | 'failed' | 'dead_letter'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
