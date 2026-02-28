/**
 * Supabase Database TypeScript types for Litix
 *
 * To regenerate:
 *   npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
 *
 * Or update manually based on migrations in supabase/migrations/
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          slug: string
          name: string
          plan: string
          stripe_customer_id: string | null
          settings: Json
          trial_ends_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          plan?: string
          stripe_customer_id?: string | null
          settings?: Json
          trial_ends_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          plan?: string
          stripe_customer_id?: string | null
          settings?: Json
          trial_ends_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_members: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role: Database['public']['Enums']['member_role']
          invited_by: string | null
          invited_at: string | null
          accepted_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          role?: Database['public']['Enums']['member_role']
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          role?: Database['public']['Enums']['member_role']
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          avatar_url: string | null
          oab_number: string | null
          oab_state: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          oab_number?: string | null
          oab_state?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          oab_number?: string | null
          oab_state?: string | null
          phone?: string | null
          created_at?: string
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
          movement_count: number
          status: string | null
          area: string | null
          classe: string | null
          assunto_principal: string | null
          juiz: string | null
          valor_causa: number | null
          data_distribuicao: string | null
          partes_json: Json | null
          provider_data: Json | null
          tags: string[]
          notes: string | null
          import_source: string
          created_at: string
          updated_at: string
          client_id: string | null
          cliente: string | null
          contingencia: string | null
          probabilidade: string | null
          faixa: string | null
          risco: string | null
          resultado: string | null
          desfecho: string | null
          responsavel: string | null
          setor: string | null
          relacionamento: string | null
          provisionamento: number | null
          reserva: number | null
          nome_caso: string | null
          foro: string | null
          tipo: string | null
          natureza: string | null
          justica: string | null
          instancia: number | null
          ente: string | null
          orgao: string | null
          ultimo_andamento: string | null
          tracking_id: string | null
          request_id: string | null
          ultimo_step_date: string | null
          justice_code: string | null
          tribunal_code: string | null
          instance_code: string | null
          sigilo: number
          assuntos_json: Json | null
          classificacao: string | null
          vara: string | null
          link_tribunal: string | null
          ultimas_5_mov: string | null
          dias_sem_mov: number | null
          completeness: number | null
          merged_from: string[] | null
          autor_principal: string | null
          reu_principal: string | null
          estado: string | null
          cidade: string | null
          fase: string | null
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
          movement_count?: number
          status?: string | null
          area?: string | null
          classe?: string | null
          assunto_principal?: string | null
          juiz?: string | null
          valor_causa?: number | null
          data_distribuicao?: string | null
          partes_json?: Json | null
          provider_data?: Json | null
          tags?: string[]
          notes?: string | null
          import_source?: string
          created_at?: string
          updated_at?: string
          client_id?: string | null
          cliente?: string | null
          contingencia?: string | null
          probabilidade?: string | null
          faixa?: string | null
          risco?: string | null
          resultado?: string | null
          desfecho?: string | null
          responsavel?: string | null
          setor?: string | null
          relacionamento?: string | null
          provisionamento?: number | null
          reserva?: number | null
          nome_caso?: string | null
          foro?: string | null
          tipo?: string | null
          natureza?: string | null
          justica?: string | null
          instancia?: number | null
          ente?: string | null
          orgao?: string | null
          ultimo_andamento?: string | null
          tracking_id?: string | null
          request_id?: string | null
          ultimo_step_date?: string | null
          justice_code?: string | null
          tribunal_code?: string | null
          instance_code?: string | null
          sigilo?: number
          assuntos_json?: Json | null
          classificacao?: string | null
          vara?: string | null
          link_tribunal?: string | null
          ultimas_5_mov?: string | null
          dias_sem_mov?: number | null
          completeness?: number | null
          merged_from?: string[] | null
          autor_principal?: string | null
          reu_principal?: string | null
          estado?: string | null
          cidade?: string | null
          fase?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          cnj?: string
          tribunal?: string | null
          provider?: string | null
          monitor_enabled?: boolean
          last_checked_at?: string | null
          last_movement_hash?: string | null
          movement_count?: number
          status?: string | null
          area?: string | null
          classe?: string | null
          assunto_principal?: string | null
          juiz?: string | null
          valor_causa?: number | null
          data_distribuicao?: string | null
          partes_json?: Json | null
          provider_data?: Json | null
          tags?: string[]
          notes?: string | null
          import_source?: string
          created_at?: string
          updated_at?: string
          client_id?: string | null
          cliente?: string | null
          contingencia?: string | null
          probabilidade?: string | null
          faixa?: string | null
          risco?: string | null
          resultado?: string | null
          desfecho?: string | null
          responsavel?: string | null
          setor?: string | null
          relacionamento?: string | null
          provisionamento?: number | null
          reserva?: number | null
          nome_caso?: string | null
          foro?: string | null
          tipo?: string | null
          natureza?: string | null
          justica?: string | null
          instancia?: number | null
          ente?: string | null
          orgao?: string | null
          ultimo_andamento?: string | null
          tracking_id?: string | null
          request_id?: string | null
          ultimo_step_date?: string | null
          justice_code?: string | null
          tribunal_code?: string | null
          instance_code?: string | null
          sigilo?: number
          assuntos_json?: Json | null
          classificacao?: string | null
          vara?: string | null
          link_tribunal?: string | null
          ultimas_5_mov?: string | null
          dias_sem_mov?: number | null
          completeness?: number | null
          merged_from?: string[] | null
          autor_principal?: string | null
          reu_principal?: string | null
          estado?: string | null
          cidade?: string | null
          fase?: string | null
        }
        Relationships: []
      }
      case_movements: {
        Row: {
          id: string
          tenant_id: string
          case_id: string
          movement_date: string
          type: string | null
          description: string
          content: string | null
          code: string | null
          provider: string | null
          detected_at: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          case_id: string
          movement_date: string
          type?: string | null
          description: string
          content?: string | null
          code?: string | null
          provider?: string | null
          detected_at?: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          case_id?: string
          movement_date?: string
          type?: string | null
          description?: string
          content?: string | null
          code?: string | null
          provider?: string | null
          detected_at?: string
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          id: string
          tenant_id: string
          member_id: string
          case_id: string
          movement_id: string | null
          type: Database['public']['Enums']['alert_type']
          title: string
          body: string
          read: boolean
          read_at: string | null
          email_sent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          member_id: string
          case_id: string
          movement_id?: string | null
          type?: Database['public']['Enums']['alert_type']
          title: string
          body: string
          read?: boolean
          read_at?: string | null
          email_sent?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          member_id?: string
          case_id?: string
          movement_id?: string | null
          type?: Database['public']['Enums']['alert_type']
          title?: string
          body?: string
          read?: boolean
          read_at?: string | null
          email_sent?: boolean
          created_at?: string
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
          last_delivery_at: string | null
          last_delivery_status: string | null
          failure_count: number
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
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          failure_count?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          url?: string
          secret?: string
          events?: string[]
          is_active?: boolean
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          failure_count?: number
          created_by?: string | null
          created_at?: string
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
          status: Database['public']['Enums']['delivery_status']
          attempt_count: number
          next_attempt_at: string | null
          last_response_status: number | null
          last_response_body: string | null
          delivered_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          endpoint_id: string
          alert_id?: string | null
          event_type: string
          payload: Json
          status?: Database['public']['Enums']['delivery_status']
          attempt_count?: number
          next_attempt_at?: string | null
          last_response_status?: number | null
          last_response_body?: string | null
          delivered_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          endpoint_id?: string
          alert_id?: string | null
          event_type?: string
          payload?: Json
          status?: Database['public']['Enums']['delivery_status']
          attempt_count?: number
          next_attempt_at?: string | null
          last_response_status?: number | null
          last_response_body?: string | null
          delivered_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      plan_limits: {
        Row: {
          plan: string
          display_name: string
          max_cases: number
          max_users: number
          max_oab_per_member: number
          api_rate_limit: number
          webhook_endpoints: number
          monitoring_frequency_hours: number
          features: Json
          price_monthly_brl: number | null
          sort_order: number
          is_active: boolean
        }
        Insert: {
          plan: string
          display_name: string
          max_cases: number
          max_users: number
          max_oab_per_member?: number
          api_rate_limit: number
          webhook_endpoints: number
          monitoring_frequency_hours?: number
          features?: Json
          price_monthly_brl?: number | null
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          plan?: string
          display_name?: string
          max_cases?: number
          max_users?: number
          max_oab_per_member?: number
          api_rate_limit?: number
          webhook_endpoints?: number
          monitoring_frequency_hours?: number
          features?: Json
          price_monthly_brl?: number | null
          sort_order?: number
          is_active?: boolean
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          tenant_id: string
          plan: string
          status: string
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          stripe_current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          plan?: string
          status?: string
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          stripe_current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          plan?: string
          status?: string
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          stripe_current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      oab_imports: {
        Row: {
          id: string
          tenant_id: string
          member_id: string
          oab_number: string
          oab_uf: string
          status: string
          trigger_id: string | null
          tribunals_total: number
          tribunals_done: number
          cases_found: number
          cases_imported: number
          cases_deduplicated: number
          providers_used: string[] | null
          error: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          member_id: string
          oab_number: string
          oab_uf: string
          status?: string
          trigger_id?: string | null
          tribunals_total?: number
          tribunals_done?: number
          cases_found?: number
          cases_imported?: number
          cases_deduplicated?: number
          providers_used?: string[] | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          member_id?: string
          oab_number?: string
          oab_uf?: string
          status?: string
          trigger_id?: string | null
          tribunals_total?: number
          tribunals_done?: number
          cases_found?: number
          cases_imported?: number
          cases_deduplicated?: number
          providers_used?: string[] | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          tenant_id: string
          name: string
          tipo_pessoa: string | null
          documento: string | null
          email: string | null
          phone: string | null
          address_line: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          tipo_pessoa?: string | null
          documento?: string | null
          email?: string | null
          phone?: string | null
          address_line?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          tipo_pessoa?: string | null
          documento?: string | null
          email?: string | null
          phone?: string | null
          address_line?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_searches: {
        Row: {
          id: string
          tenant_id: string
          member_id: string
          document_type: string
          document_value: string
          client_id: string | null
          status: string
          trigger_id: string | null
          cases_found: number
          cases_imported: number
          cases_deduplicated: number
          providers_used: string[] | null
          error: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          member_id: string
          document_type: string
          document_value: string
          client_id?: string | null
          status?: string
          trigger_id?: string | null
          cases_found?: number
          cases_imported?: number
          cases_deduplicated?: number
          providers_used?: string[] | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          member_id?: string
          document_type?: string
          document_value?: string
          client_id?: string | null
          status?: string
          trigger_id?: string | null
          cases_found?: number
          cases_imported?: number
          cases_deduplicated?: number
          providers_used?: string[] | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      monitoring_jobs: {
        Row: {
          id: string
          tenant_id: string
          case_id: string
          status: string
          provider_used: string | null
          movements_found: number
          duration_ms: number | null
          error_message: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          case_id: string
          status?: string
          provider_used?: string | null
          movements_found?: number
          duration_ms?: number | null
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          case_id?: string
          status?: string
          provider_used?: string | null
          movements_found?: number
          duration_ms?: number | null
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      case_members: {
        Row: {
          id: string
          case_id: string
          tenant_id: string
          member_id: string
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          tenant_id: string
          member_id: string
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          tenant_id?: string
          member_id?: string
          created_at?: string
        }
        Relationships: []
      }
      provider_queries: {
        Row: {
          id: string
          tenant_id: string | null
          provider: string
          search_type: string
          search_key: string
          tribunal: string | null
          status: string
          duration_ms: number | null
          completeness_score: number | null
          fields_returned: number | null
          cost_estimate_brl: number
          error: string | null
          source_flow: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          provider: string
          search_type?: string
          search_key: string
          tribunal?: string | null
          status?: string
          duration_ms?: number | null
          completeness_score?: number | null
          fields_returned?: number | null
          cost_estimate_brl?: number
          error?: string | null
          source_flow?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          provider?: string
          search_type?: string
          search_key?: string
          tribunal?: string | null
          status?: string
          duration_ms?: number | null
          completeness_score?: number | null
          fields_returned?: number | null
          cost_estimate_brl?: number
          error?: string | null
          source_flow?: string | null
          created_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: number
          tenant_id: string | null
          member_id: string | null
          action: string
          table_name: string | null
          record_id: string | null
          old_data: Json | null
          new_data: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: number
          tenant_id?: string | null
          member_id?: string | null
          action: string
          table_name?: string | null
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          tenant_id?: string | null
          member_id?: string | null
          action?: string
          table_name?: string | null
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_tenant_usage: {
        Args: {
          p_tenant_id: string
        }
        Returns: Json
      }
      get_cases_to_monitor: {
        Args: {
          batch_limit: number
        }
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'] & Database['public']['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'] &
        Database['public']['Views'])
    ? (Database['public']['Tables'] &
        Database['public']['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database['public']['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof Database['public']['Enums']
    ? Database['public']['Enums'][PublicEnumNameOrOptions]
    : never
