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
      activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          lead_id: string
          metadata: Json | null
          title: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          title: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          id: string
          lead_id: string
          inspection_date: string
          inspector_id: string
          inspector_name: string | null
          job_number: string | null
          no_demolition_hours: number | null
          demolition_hours: number | null
          construction_hours: number | null
          subfloor_hours: number | null
          dehumidifier_count: number | null
          air_mover_count: number | null
          rcd_count: number | null
          equipment_days: number | null
          manual_price_override: boolean | null
          manual_total_inc_gst: number | null
          labor_cost_ex_gst: number | null
          discount_percent: number | null
          subtotal_ex_gst: number | null
          gst_amount: number | null
          total_inc_gst: number | null
          equipment_cost_ex_gst: number | null
          equipment_cost_inc_gst: number | null
          created_at: string | null
          updated_at: string | null
          dwelling_type: string | null
          property_occupation: string | null
          attention_to: string | null
          requested_by: string | null
          cause_of_mould: string | null
          triage_description: string | null
          outdoor_temperature: number | null
          outdoor_humidity: number | null
          outdoor_dew_point: number | null
          outdoor_comments: string | null
          parking_option: string | null
          waste_disposal_required: boolean | null
          waste_disposal_cost: number | null
          waste_disposal_amount: string | null
          subfloor_required: boolean | null
          additional_equipment_comments: string | null
          additional_info_technician: string | null
          recommended_dehumidifier: string | null
          selected_job_type: string | null
          total_time_minutes: number | null
          estimated_cost_ex_gst: number | null
          estimated_cost_inc_gst: number | null
          report_generated: boolean | null
          report_pdf_url: string | null
          report_sent_date: string | null
          inspection_start_time: string | null
          pdf_url: string | null
          pdf_version: number | null
          pdf_approved: boolean | null
          pdf_approved_by: string | null
          pdf_approved_at: string | null
          pdf_generated_at: string | null
          last_edited_by: string | null
          last_edited_at: string | null
          ai_summary_text: string | null
          ai_summary_approved: boolean | null
          ai_summary_generated_at: string | null
          direction_photos_enabled: boolean | null
          antimicrobial: boolean | null
          hepa_vac: boolean | null
          stain_removing_antimicrobial: boolean | null
          home_sanitation_fogging: boolean | null
          drying_equipment_enabled: boolean | null
          commercial_dehumidifier_enabled: boolean | null
          commercial_dehumidifier_qty: number | null
          air_movers_enabled: boolean | null
          air_movers_qty: number | null
          rcd_box_enabled: boolean | null
          rcd_box_qty: number | null
          dehumidifier_rate: number | null
          air_mover_rate: number | null
          rcd_rate: number | null
          demo_labour_rate: number | null
          non_demo_labour_rate: number | null
          subfloor_labour_rate: number | null
          manual_labor_override: boolean | null
          contributing_factors: string | null
          identified_causes: string | null
          immediate_actions: string | null
          long_term_protection: string | null
          timeline_text: string | null
          what_we_discovered: string | null
          why_this_happened: string | null
          what_success_looks_like: string | null
          what_we_found_text: string | null
          what_we_will_do_text: string | null
          what_you_get_text: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          inspection_date: string
          inspector_id: string
          inspector_name?: string | null
          job_number?: string | null
          no_demolition_hours?: number | null
          demolition_hours?: number | null
          construction_hours?: number | null
          subfloor_hours?: number | null
          dehumidifier_count?: number | null
          air_mover_count?: number | null
          rcd_count?: number | null
          equipment_days?: number | null
          manual_price_override?: boolean | null
          manual_total_inc_gst?: number | null
          labor_cost_ex_gst?: number | null
          discount_percent?: number | null
          subtotal_ex_gst?: number | null
          gst_amount?: number | null
          total_inc_gst?: number | null
          equipment_cost_ex_gst?: number | null
          equipment_cost_inc_gst?: number | null
          created_at?: string | null
          updated_at?: string | null
          dwelling_type?: string | null
          property_occupation?: string | null
          attention_to?: string | null
          requested_by?: string | null
          cause_of_mould?: string | null
          triage_description?: string | null
          outdoor_temperature?: number | null
          outdoor_humidity?: number | null
          outdoor_dew_point?: number | null
          outdoor_comments?: string | null
          parking_option?: string | null
          waste_disposal_required?: boolean | null
          waste_disposal_cost?: number | null
          waste_disposal_amount?: string | null
          subfloor_required?: boolean | null
          additional_equipment_comments?: string | null
          additional_info_technician?: string | null
          recommended_dehumidifier?: string | null
          selected_job_type?: string | null
          total_time_minutes?: number | null
          estimated_cost_ex_gst?: number | null
          estimated_cost_inc_gst?: number | null
          report_generated?: boolean | null
          report_pdf_url?: string | null
          report_sent_date?: string | null
          inspection_start_time?: string | null
          pdf_url?: string | null
          pdf_version?: number | null
          pdf_approved?: boolean | null
          pdf_approved_by?: string | null
          pdf_approved_at?: string | null
          pdf_generated_at?: string | null
          last_edited_by?: string | null
          last_edited_at?: string | null
          ai_summary_text?: string | null
          ai_summary_approved?: boolean | null
          ai_summary_generated_at?: string | null
          direction_photos_enabled?: boolean | null
          antimicrobial?: boolean | null
          hepa_vac?: boolean | null
          stain_removing_antimicrobial?: boolean | null
          home_sanitation_fogging?: boolean | null
          drying_equipment_enabled?: boolean | null
          commercial_dehumidifier_enabled?: boolean | null
          commercial_dehumidifier_qty?: number | null
          air_movers_enabled?: boolean | null
          air_movers_qty?: number | null
          rcd_box_enabled?: boolean | null
          rcd_box_qty?: number | null
          dehumidifier_rate?: number | null
          air_mover_rate?: number | null
          rcd_rate?: number | null
          demo_labour_rate?: number | null
          non_demo_labour_rate?: number | null
          subfloor_labour_rate?: number | null
          manual_labor_override?: boolean | null
          contributing_factors?: string | null
          identified_causes?: string | null
          immediate_actions?: string | null
          long_term_protection?: string | null
          timeline_text?: string | null
          what_we_discovered?: string | null
          why_this_happened?: string | null
          what_success_looks_like?: string | null
          what_we_found_text?: string | null
          what_we_will_do_text?: string | null
          what_you_get_text?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          inspection_date?: string
          inspector_id?: string
          inspector_name?: string | null
          job_number?: string | null
          no_demolition_hours?: number | null
          demolition_hours?: number | null
          construction_hours?: number | null
          subfloor_hours?: number | null
          dehumidifier_count?: number | null
          air_mover_count?: number | null
          rcd_count?: number | null
          equipment_days?: number | null
          manual_price_override?: boolean | null
          manual_total_inc_gst?: number | null
          labor_cost_ex_gst?: number | null
          discount_percent?: number | null
          subtotal_ex_gst?: number | null
          gst_amount?: number | null
          total_inc_gst?: number | null
          equipment_cost_ex_gst?: number | null
          equipment_cost_inc_gst?: number | null
          created_at?: string | null
          updated_at?: string | null
          dwelling_type?: string | null
          property_occupation?: string | null
          attention_to?: string | null
          requested_by?: string | null
          cause_of_mould?: string | null
          triage_description?: string | null
          outdoor_temperature?: number | null
          outdoor_humidity?: number | null
          outdoor_dew_point?: number | null
          outdoor_comments?: string | null
          parking_option?: string | null
          waste_disposal_required?: boolean | null
          waste_disposal_cost?: number | null
          waste_disposal_amount?: string | null
          subfloor_required?: boolean | null
          additional_equipment_comments?: string | null
          additional_info_technician?: string | null
          recommended_dehumidifier?: string | null
          selected_job_type?: string | null
          total_time_minutes?: number | null
          estimated_cost_ex_gst?: number | null
          estimated_cost_inc_gst?: number | null
          report_generated?: boolean | null
          report_pdf_url?: string | null
          report_sent_date?: string | null
          inspection_start_time?: string | null
          pdf_url?: string | null
          pdf_version?: number | null
          pdf_approved?: boolean | null
          pdf_approved_by?: string | null
          pdf_approved_at?: string | null
          pdf_generated_at?: string | null
          last_edited_by?: string | null
          last_edited_at?: string | null
          ai_summary_text?: string | null
          ai_summary_approved?: boolean | null
          ai_summary_generated_at?: string | null
          direction_photos_enabled?: boolean | null
          antimicrobial?: boolean | null
          hepa_vac?: boolean | null
          stain_removing_antimicrobial?: boolean | null
          home_sanitation_fogging?: boolean | null
          drying_equipment_enabled?: boolean | null
          commercial_dehumidifier_enabled?: boolean | null
          commercial_dehumidifier_qty?: number | null
          air_movers_enabled?: boolean | null
          air_movers_qty?: number | null
          rcd_box_enabled?: boolean | null
          rcd_box_qty?: number | null
          dehumidifier_rate?: number | null
          air_mover_rate?: number | null
          rcd_rate?: number | null
          demo_labour_rate?: number | null
          non_demo_labour_rate?: number | null
          subfloor_labour_rate?: number | null
          manual_labor_override?: boolean | null
          contributing_factors?: string | null
          identified_causes?: string | null
          immediate_actions?: string | null
          long_term_protection?: string | null
          timeline_text?: string | null
          what_we_discovered?: string | null
          why_this_happened?: string | null
          what_success_looks_like?: string | null
          what_we_found_text?: string | null
          what_we_will_do_text?: string | null
          what_you_get_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_lead_id_fkey1"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          access_instructions: string | null
          assigned_to: string | null
          booked_at: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          inspection_completed_date: string | null
          inspection_scheduled_date: string | null
          invoice_amount: number | null
          invoice_sent_date: string | null
          issue_description: string | null
          job_completed_date: string | null
          job_scheduled_date: string | null
          lead_number: string | null
          lead_source: string | null
          lead_source_other: string | null
          notes: string | null
          payment_received_date: string | null
          phone: string
          property_address_postcode: string
          property_address_state: string | null
          property_address_street: string
          property_address_suburb: string
          property_lat: number | null
          property_lng: number | null
          property_type: string | null
          property_zone: number | null
          quoted_amount: number | null
          report_pdf_url: string | null
          scheduled_dates: string[] | null
          scheduled_time: string | null
          special_requests: string | null
          status: string
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          access_instructions?: string | null
          assigned_to?: string | null
          booked_at?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          inspection_completed_date?: string | null
          inspection_scheduled_date?: string | null
          invoice_amount?: number | null
          invoice_sent_date?: string | null
          issue_description?: string | null
          job_completed_date?: string | null
          job_scheduled_date?: string | null
          lead_number?: string | null
          lead_source?: string | null
          lead_source_other?: string | null
          notes?: string | null
          payment_received_date?: string | null
          phone: string
          property_address_postcode: string
          property_address_state?: string | null
          property_address_street: string
          property_address_suburb: string
          property_lat?: number | null
          property_lng?: number | null
          property_type?: string | null
          property_zone?: number | null
          quoted_amount?: number | null
          report_pdf_url?: string | null
          scheduled_dates?: string[] | null
          scheduled_time?: string | null
          special_requests?: string | null
          status?: string
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          access_instructions?: string | null
          assigned_to?: string | null
          booked_at?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          inspection_completed_date?: string | null
          inspection_scheduled_date?: string | null
          invoice_amount?: number | null
          invoice_sent_date?: string | null
          issue_description?: string | null
          job_completed_date?: string | null
          job_scheduled_date?: string | null
          lead_number?: string | null
          lead_source?: string | null
          lead_source_other?: string | null
          notes?: string | null
          payment_received_date?: string | null
          phone?: string
          property_address_postcode?: string
          property_address_state?: string | null
          property_address_street?: string
          property_address_suburb?: string
          property_lat?: number | null
          property_lng?: number | null
          property_type?: string | null
          property_zone?: number | null
          quoted_amount?: number | null
          report_pdf_url?: string | null
          scheduled_dates?: string[] | null
          scheduled_time?: string | null
          special_requests?: string | null
          status?: string
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: { _role_name: string; _user_id: string }
        Returns: boolean
      }
      is_admin:
        | { Args: Record<PropertyKey, never>; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      booking_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "rescheduled"
      dwelling_type:
        | "house"
        | "units"
        | "apartment"
        | "duplex"
        | "townhouse"
        | "commercial"
        | "construction"
        | "industrial"
      invoice_status: "draft" | "sent" | "overdue" | "paid" | "cancelled"
      job_type: "no_demolition_surface" | "demo" | "construction" | "subfloor"
      lead_status:
        | "hipages_lead"
        | "new_lead"
        | "contacted"
        | "inspection_waiting"
        | "approve_inspection_report"
        | "inspection_email_approval"
        | "inspection_completed"
        | "inspection_report_pdf_completed"
        | "job_waiting"
        | "job_completed"
        | "job_report_pdf_sent"
        | "invoicing_sent"
        | "paid"
        | "google_review"
        | "finished"
        | "closed"
        | "not_landed"
      moisture_status: "dry" | "elevated" | "wet" | "very_wet"
      payment_method: "bank_transfer" | "credit_card" | "cash" | "cheque"
      property_occupation:
        | "tenanted"
        | "vacant"
        | "owner_occupied"
        | "tenants_vacating"
      user_role: "admin" | "technician" | "manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
