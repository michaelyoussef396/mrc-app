export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
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
      app_settings: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      booking_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          lead_id: string
          token: string
          used: boolean | null
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          lead_id: string
          token: string
          used?: boolean | null
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          lead_id?: string
          token?: string
          used?: boolean | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_tokens_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_bookings: {
        Row: {
          all_day: boolean | null
          assigned_to: string
          created_at: string | null
          description: string | null
          end_datetime: string
          event_type: string
          id: string
          inspection_id: string | null
          lead_id: string | null
          location_address: string | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          start_datetime: string
          status: Database["public"]["Enums"]["booking_status"] | null
          title: string
          travel_from_suburb: string | null
          travel_time_minutes: number | null
          travel_to_suburb: string | null
          updated_at: string | null
        }
        Insert: {
          all_day?: boolean | null
          assigned_to: string
          created_at?: string | null
          description?: string | null
          end_datetime: string
          event_type: string
          id?: string
          inspection_id?: string | null
          lead_id?: string | null
          location_address?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          start_datetime: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          title: string
          travel_from_suburb?: string | null
          travel_time_minutes?: number | null
          travel_to_suburb?: string | null
          updated_at?: string | null
        }
        Update: {
          all_day?: boolean | null
          assigned_to?: string
          created_at?: string | null
          description?: string | null
          end_datetime?: string
          event_type?: string
          id?: string
          inspection_id?: string | null
          lead_id?: string | null
          location_address?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          start_datetime?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          title?: string
          travel_from_suburb?: string | null
          travel_time_minutes?: number | null
          travel_to_suburb?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_bookings_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspection_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      client_booking_tokens: {
        Row: {
          booked_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          inspection_id: string
          token: string
          used: boolean | null
        }
        Insert: {
          booked_at?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          inspection_id: string
          token: string
          used?: boolean | null
        }
        Update: {
          booked_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          inspection_id?: string
          token?: string
          used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "client_booking_tokens_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspection_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          abn: string | null
          address_postcode: string | null
          address_state: string | null
          address_street: string | null
          address_suburb: string | null
          business_name: string
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          abn?: string | null
          address_postcode?: string | null
          address_state?: string | null
          address_street?: string | null
          address_suburb?: string | null
          business_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          abn?: string | null
          address_postcode?: string | null
          address_state?: string | null
          address_street?: string | null
          address_suburb?: string | null
          business_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      editable_fields: {
        Row: {
          created_at: string | null
          edit_icon_position: Json | null
          field_column: string
          field_key: string
          field_label: string
          field_table: string
          field_type: string
          id: string
          is_active: boolean | null
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string | null
          edit_icon_position?: Json | null
          field_column: string
          field_key: string
          field_label: string
          field_table: string
          field_type: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string | null
          edit_icon_position?: Json | null
          field_column?: string
          field_key?: string
          field_label?: string
          field_table?: string
          field_type?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          clicked_at: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          inspection_id: string | null
          lead_id: string | null
          metadata: Json | null
          opened_at: string | null
          provider: string | null
          provider_message_id: string | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string
          template_name: string
          updated_at: string | null
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          inspection_id?: string | null
          lead_id?: string | null
          metadata?: Json | null
          opened_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject: string
          template_name: string
          updated_at?: string | null
        }
        Update: {
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          inspection_id?: string | null
          lead_id?: string | null
          metadata?: Json | null
          opened_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string
          template_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspection_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category: string | null
          created_at: string | null
          daily_rate: number
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          quantity_available: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          daily_rate: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          quantity_available?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          daily_rate?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          quantity_available?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      equipment_bookings: {
        Row: {
          created_at: string | null
          daily_rate: number | null
          duration_days: number
          equipment_id: string
          id: string
          inspection_id: string
          quantity: number
          total_cost_ex_gst: number | null
          total_cost_inc_gst: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_rate?: number | null
          duration_days: number
          equipment_id: string
          id?: string
          inspection_id: string
          quantity?: number
          total_cost_ex_gst?: number | null
          total_cost_inc_gst?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_rate?: number | null
          duration_days?: number
          equipment_id?: string
          id?: string
          inspection_id?: string
          quantity?: number
          total_cost_ex_gst?: number | null
          total_cost_inc_gst?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_bookings_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_bookings_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_areas: {
        Row: {
          area_name: string
          area_order: number | null
          comments: string | null
          comments_approved: boolean | null
          created_at: string | null
          demolition_description: string | null
          demolition_required: boolean | null
          demolition_time_minutes: number | null
          dew_point: number | null
          external_moisture: number | null
          humidity: number | null
          id: string
          infrared_enabled: boolean | null
          infrared_observation_condensation: boolean | null
          infrared_observation_missing_insulation: boolean | null
          infrared_observation_no_active: boolean | null
          infrared_observation_past_ingress: boolean | null
          infrared_observation_water_infiltration: boolean | null
          inspection_id: string
          internal_office_notes: string | null
          job_time_minutes: number
          moisture_readings_enabled: boolean | null
          mould_ceiling: boolean | null
          mould_contents: boolean | null
          mould_cornice: boolean | null
          mould_cupboard: boolean | null
          mould_description: string | null
          mould_flooring: boolean | null
          mould_grout_silicone: boolean | null
          mould_none_visible: boolean | null
          mould_skirting: boolean | null
          mould_walls: boolean | null
          mould_wardrobe: boolean | null
          mould_window_furnishings: boolean | null
          mould_windows: boolean | null
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          area_name: string
          area_order?: number | null
          comments?: string | null
          comments_approved?: boolean | null
          created_at?: string | null
          demolition_description?: string | null
          demolition_required?: boolean | null
          demolition_time_minutes?: number | null
          dew_point?: number | null
          external_moisture?: number | null
          humidity?: number | null
          id?: string
          infrared_enabled?: boolean | null
          infrared_observation_condensation?: boolean | null
          infrared_observation_missing_insulation?: boolean | null
          infrared_observation_no_active?: boolean | null
          infrared_observation_past_ingress?: boolean | null
          infrared_observation_water_infiltration?: boolean | null
          inspection_id: string
          internal_office_notes?: string | null
          job_time_minutes: number
          moisture_readings_enabled?: boolean | null
          mould_ceiling?: boolean | null
          mould_contents?: boolean | null
          mould_cornice?: boolean | null
          mould_cupboard?: boolean | null
          mould_description?: string | null
          mould_flooring?: boolean | null
          mould_grout_silicone?: boolean | null
          mould_none_visible?: boolean | null
          mould_skirting?: boolean | null
          mould_walls?: boolean | null
          mould_wardrobe?: boolean | null
          mould_window_furnishings?: boolean | null
          mould_windows?: boolean | null
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          area_name?: string
          area_order?: number | null
          comments?: string | null
          comments_approved?: boolean | null
          created_at?: string | null
          demolition_description?: string | null
          demolition_required?: boolean | null
          demolition_time_minutes?: number | null
          dew_point?: number | null
          external_moisture?: number | null
          humidity?: number | null
          id?: string
          infrared_enabled?: boolean | null
          infrared_observation_condensation?: boolean | null
          infrared_observation_missing_insulation?: boolean | null
          infrared_observation_no_active?: boolean | null
          infrared_observation_past_ingress?: boolean | null
          infrared_observation_water_infiltration?: boolean | null
          inspection_id?: string
          internal_office_notes?: string | null
          job_time_minutes?: number
          moisture_readings_enabled?: boolean | null
          mould_ceiling?: boolean | null
          mould_contents?: boolean | null
          mould_cornice?: boolean | null
          mould_cupboard?: boolean | null
          mould_description?: string | null
          mould_flooring?: boolean | null
          mould_grout_silicone?: boolean | null
          mould_none_visible?: boolean | null
          mould_skirting?: boolean | null
          mould_walls?: boolean | null
          mould_wardrobe?: boolean | null
          mould_window_furnishings?: boolean | null
          mould_windows?: boolean | null
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_areas_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_reports: {
        Row: {
          additional_equipment_comments: string | null
          additional_info_technician: string | null
          attention_to: string | null
          cause_of_mould: string | null
          created_at: string | null
          dwelling_type: Database["public"]["Enums"]["dwelling_type"] | null
          equipment_cost_ex_gst: number | null
          equipment_cost_inc_gst: number | null
          estimated_cost_ex_gst: number | null
          estimated_cost_inc_gst: number | null
          id: string
          inspection_date: string
          inspection_start_time: string | null
          inspector_id: string
          job_number: string
          lead_id: string
          outdoor_comments: string | null
          outdoor_dew_point: number | null
          outdoor_humidity: number | null
          outdoor_temperature: number | null
          parking_option: string | null
          property_occupation:
            | Database["public"]["Enums"]["property_occupation"]
            | null
          recommended_dehumidifier: string | null
          report_generated: boolean | null
          report_pdf_url: string | null
          report_sent_date: string | null
          requested_by: string | null
          selected_job_type: Database["public"]["Enums"]["job_type"] | null
          subfloor_required: boolean | null
          total_time_minutes: number | null
          triage_description: string | null
          updated_at: string | null
          waste_disposal_cost: number | null
          waste_disposal_required: boolean | null
        }
        Insert: {
          additional_equipment_comments?: string | null
          additional_info_technician?: string | null
          attention_to?: string | null
          cause_of_mould?: string | null
          created_at?: string | null
          dwelling_type?: Database["public"]["Enums"]["dwelling_type"] | null
          equipment_cost_ex_gst?: number | null
          equipment_cost_inc_gst?: number | null
          estimated_cost_ex_gst?: number | null
          estimated_cost_inc_gst?: number | null
          id?: string
          inspection_date?: string
          inspection_start_time?: string | null
          inspector_id: string
          job_number: string
          lead_id: string
          outdoor_comments?: string | null
          outdoor_dew_point?: number | null
          outdoor_humidity?: number | null
          outdoor_temperature?: number | null
          parking_option?: string | null
          property_occupation?:
            | Database["public"]["Enums"]["property_occupation"]
            | null
          recommended_dehumidifier?: string | null
          report_generated?: boolean | null
          report_pdf_url?: string | null
          report_sent_date?: string | null
          requested_by?: string | null
          selected_job_type?: Database["public"]["Enums"]["job_type"] | null
          subfloor_required?: boolean | null
          total_time_minutes?: number | null
          triage_description?: string | null
          updated_at?: string | null
          waste_disposal_cost?: number | null
          waste_disposal_required?: boolean | null
        }
        Update: {
          additional_equipment_comments?: string | null
          additional_info_technician?: string | null
          attention_to?: string | null
          cause_of_mould?: string | null
          created_at?: string | null
          dwelling_type?: Database["public"]["Enums"]["dwelling_type"] | null
          equipment_cost_ex_gst?: number | null
          equipment_cost_inc_gst?: number | null
          estimated_cost_ex_gst?: number | null
          estimated_cost_inc_gst?: number | null
          id?: string
          inspection_date?: string
          inspection_start_time?: string | null
          inspector_id?: string
          job_number?: string
          lead_id?: string
          outdoor_comments?: string | null
          outdoor_dew_point?: number | null
          outdoor_humidity?: number | null
          outdoor_temperature?: number | null
          parking_option?: string | null
          property_occupation?:
            | Database["public"]["Enums"]["property_occupation"]
            | null
          recommended_dehumidifier?: string | null
          report_generated?: boolean | null
          report_pdf_url?: string | null
          report_sent_date?: string | null
          requested_by?: string | null
          selected_job_type?: Database["public"]["Enums"]["job_type"] | null
          subfloor_required?: boolean | null
          total_time_minutes?: number | null
          triage_description?: string | null
          updated_at?: string | null
          waste_disposal_cost?: number | null
          waste_disposal_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          additional_equipment_comments: string | null
          additional_info_technician: string | null
          ai_summary_approved: boolean | null
          ai_summary_generated_at: string | null
          ai_summary_text: string | null
          air_mover_count: number | null
          air_mover_rate: number | null
          air_movers_enabled: boolean | null
          air_movers_qty: number | null
          antimicrobial: boolean | null
          attention_to: string | null
          cause_of_mould: string | null
          commercial_dehumidifier_enabled: boolean | null
          commercial_dehumidifier_qty: number | null
          construction_hours: number | null
          contributing_factors: string | null
          created_at: string | null
          dehumidifier_count: number | null
          dehumidifier_rate: number | null
          demo_labour_rate: number | null
          demolition_hours: number | null
          direction_photos_enabled: boolean | null
          discount_percent: number | null
          drying_equipment_enabled: boolean | null
          dwelling_type: Database["public"]["Enums"]["dwelling_type"] | null
          equipment_cost_ex_gst: number | null
          equipment_cost_inc_gst: number | null
          equipment_days: number | null
          estimated_cost_ex_gst: number | null
          estimated_cost_inc_gst: number | null
          gst_amount: number | null
          hepa_vac: boolean | null
          home_sanitation_fogging: boolean | null
          id: string
          identified_causes: string | null
          immediate_actions: string | null
          inspection_date: string
          inspection_start_time: string | null
          inspector_id: string
          inspector_name: string | null
          job_number: string | null
          labor_cost_ex_gst: number | null
          last_edited_at: string | null
          last_edited_by: string | null
          lead_id: string
          long_term_protection: string | null
          manual_labor_override: boolean | null
          manual_price_override: boolean | null
          manual_total_inc_gst: number | null
          no_demolition_hours: number | null
          non_demo_labour_rate: number | null
          outdoor_comments: string | null
          outdoor_dew_point: number | null
          outdoor_humidity: number | null
          outdoor_temperature: number | null
          parking_option: string | null
          pdf_approved: boolean | null
          pdf_approved_at: string | null
          pdf_approved_by: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          pdf_version: number | null
          property_occupation:
            | Database["public"]["Enums"]["property_occupation"]
            | null
          rcd_box_enabled: boolean | null
          rcd_box_qty: number | null
          rcd_count: number | null
          rcd_rate: number | null
          recommended_dehumidifier: string | null
          report_generated: boolean | null
          report_pdf_url: string | null
          report_sent_date: string | null
          requested_by: string | null
          selected_job_type: Database["public"]["Enums"]["job_type"] | null
          stain_removing_antimicrobial: boolean | null
          subfloor_hours: number | null
          subfloor_labour_rate: number | null
          subfloor_required: boolean | null
          subtotal_ex_gst: number | null
          timeline_text: string | null
          total_inc_gst: number | null
          total_time_minutes: number | null
          triage_description: string | null
          updated_at: string | null
          waste_disposal_amount: string | null
          waste_disposal_cost: number | null
          waste_disposal_required: boolean | null
          what_success_looks_like: string | null
          what_we_discovered: string | null
          what_we_found_text: string | null
          what_we_will_do_text: string | null
          what_you_get_text: string | null
          why_this_happened: string | null
        }
        Insert: {
          additional_equipment_comments?: string | null
          additional_info_technician?: string | null
          ai_summary_approved?: boolean | null
          ai_summary_generated_at?: string | null
          ai_summary_text?: string | null
          air_mover_count?: number | null
          air_mover_rate?: number | null
          air_movers_enabled?: boolean | null
          air_movers_qty?: number | null
          antimicrobial?: boolean | null
          attention_to?: string | null
          cause_of_mould?: string | null
          commercial_dehumidifier_enabled?: boolean | null
          commercial_dehumidifier_qty?: number | null
          construction_hours?: number | null
          contributing_factors?: string | null
          created_at?: string | null
          dehumidifier_count?: number | null
          dehumidifier_rate?: number | null
          demo_labour_rate?: number | null
          demolition_hours?: number | null
          direction_photos_enabled?: boolean | null
          discount_percent?: number | null
          drying_equipment_enabled?: boolean | null
          dwelling_type?: Database["public"]["Enums"]["dwelling_type"] | null
          equipment_cost_ex_gst?: number | null
          equipment_cost_inc_gst?: number | null
          equipment_days?: number | null
          estimated_cost_ex_gst?: number | null
          estimated_cost_inc_gst?: number | null
          gst_amount?: number | null
          hepa_vac?: boolean | null
          home_sanitation_fogging?: boolean | null
          id?: string
          identified_causes?: string | null
          immediate_actions?: string | null
          inspection_date: string
          inspection_start_time?: string | null
          inspector_id: string
          inspector_name?: string | null
          job_number?: string | null
          labor_cost_ex_gst?: number | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          lead_id: string
          long_term_protection?: string | null
          manual_labor_override?: boolean | null
          manual_price_override?: boolean | null
          manual_total_inc_gst?: number | null
          no_demolition_hours?: number | null
          non_demo_labour_rate?: number | null
          outdoor_comments?: string | null
          outdoor_dew_point?: number | null
          outdoor_humidity?: number | null
          outdoor_temperature?: number | null
          parking_option?: string | null
          pdf_approved?: boolean | null
          pdf_approved_at?: string | null
          pdf_approved_by?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          pdf_version?: number | null
          property_occupation?:
            | Database["public"]["Enums"]["property_occupation"]
            | null
          rcd_box_enabled?: boolean | null
          rcd_box_qty?: number | null
          rcd_count?: number | null
          rcd_rate?: number | null
          recommended_dehumidifier?: string | null
          report_generated?: boolean | null
          report_pdf_url?: string | null
          report_sent_date?: string | null
          requested_by?: string | null
          selected_job_type?: Database["public"]["Enums"]["job_type"] | null
          stain_removing_antimicrobial?: boolean | null
          subfloor_hours?: number | null
          subfloor_labour_rate?: number | null
          subfloor_required?: boolean | null
          subtotal_ex_gst?: number | null
          timeline_text?: string | null
          total_inc_gst?: number | null
          total_time_minutes?: number | null
          triage_description?: string | null
          updated_at?: string | null
          waste_disposal_amount?: string | null
          waste_disposal_cost?: number | null
          waste_disposal_required?: boolean | null
          what_success_looks_like?: string | null
          what_we_discovered?: string | null
          what_we_found_text?: string | null
          what_we_will_do_text?: string | null
          what_you_get_text?: string | null
          why_this_happened?: string | null
        }
        Update: {
          additional_equipment_comments?: string | null
          additional_info_technician?: string | null
          ai_summary_approved?: boolean | null
          ai_summary_generated_at?: string | null
          ai_summary_text?: string | null
          air_mover_count?: number | null
          air_mover_rate?: number | null
          air_movers_enabled?: boolean | null
          air_movers_qty?: number | null
          antimicrobial?: boolean | null
          attention_to?: string | null
          cause_of_mould?: string | null
          commercial_dehumidifier_enabled?: boolean | null
          commercial_dehumidifier_qty?: number | null
          construction_hours?: number | null
          contributing_factors?: string | null
          created_at?: string | null
          dehumidifier_count?: number | null
          dehumidifier_rate?: number | null
          demo_labour_rate?: number | null
          demolition_hours?: number | null
          direction_photos_enabled?: boolean | null
          discount_percent?: number | null
          drying_equipment_enabled?: boolean | null
          dwelling_type?: Database["public"]["Enums"]["dwelling_type"] | null
          equipment_cost_ex_gst?: number | null
          equipment_cost_inc_gst?: number | null
          equipment_days?: number | null
          estimated_cost_ex_gst?: number | null
          estimated_cost_inc_gst?: number | null
          gst_amount?: number | null
          hepa_vac?: boolean | null
          home_sanitation_fogging?: boolean | null
          id?: string
          identified_causes?: string | null
          immediate_actions?: string | null
          inspection_date?: string
          inspection_start_time?: string | null
          inspector_id?: string
          inspector_name?: string | null
          job_number?: string | null
          labor_cost_ex_gst?: number | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          lead_id?: string
          long_term_protection?: string | null
          manual_labor_override?: boolean | null
          manual_price_override?: boolean | null
          manual_total_inc_gst?: number | null
          no_demolition_hours?: number | null
          non_demo_labour_rate?: number | null
          outdoor_comments?: string | null
          outdoor_dew_point?: number | null
          outdoor_humidity?: number | null
          outdoor_temperature?: number | null
          parking_option?: string | null
          pdf_approved?: boolean | null
          pdf_approved_at?: string | null
          pdf_approved_by?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          pdf_version?: number | null
          property_occupation?:
            | Database["public"]["Enums"]["property_occupation"]
            | null
          rcd_box_enabled?: boolean | null
          rcd_box_qty?: number | null
          rcd_count?: number | null
          rcd_rate?: number | null
          recommended_dehumidifier?: string | null
          report_generated?: boolean | null
          report_pdf_url?: string | null
          report_sent_date?: string | null
          requested_by?: string | null
          selected_job_type?: Database["public"]["Enums"]["job_type"] | null
          stain_removing_antimicrobial?: boolean | null
          subfloor_hours?: number | null
          subfloor_labour_rate?: number | null
          subfloor_required?: boolean | null
          subtotal_ex_gst?: number | null
          timeline_text?: string | null
          total_inc_gst?: number | null
          total_time_minutes?: number | null
          triage_description?: string | null
          updated_at?: string | null
          waste_disposal_amount?: string | null
          waste_disposal_cost?: number | null
          waste_disposal_required?: boolean | null
          what_success_looks_like?: string | null
          what_we_discovered?: string | null
          what_we_found_text?: string | null
          what_we_will_do_text?: string | null
          what_you_get_text?: string | null
          why_this_happened?: string | null
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
      invoices: {
        Row: {
          created_at: string | null
          due_date: string
          gst_amount: number
          id: string
          inspection_id: string | null
          invoice_number: string | null
          issue_date: string
          lead_id: string
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_terms_days: number | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal_ex_gst: number
          total_inc_gst: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          due_date: string
          gst_amount: number
          id?: string
          inspection_id?: string | null
          invoice_number?: string | null
          issue_date: string
          lead_id: string
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_terms_days?: number | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal_ex_gst: number
          total_inc_gst: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          due_date?: string
          gst_amount?: number
          id?: string
          inspection_id?: string | null
          invoice_number?: string | null
          issue_date?: string
          lead_id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_terms_days?: number | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal_ex_gst?: number
          total_inc_gst?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspection_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_lead_id_fkey"
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
          notes: string | null
          payment_received_date: string | null
          phone: string
          property_address_postcode: string
          property_address_state: string | null
          property_address_street: string
          property_address_suburb: string
          property_type: string | null
          property_zone: number | null
          quoted_amount: number | null
          report_pdf_url: string | null
          scheduled_dates: string[] | null
          scheduled_time: string | null
          special_requests: string | null
          status: Database["public"]["Enums"]["lead_status"]
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
          notes?: string | null
          payment_received_date?: string | null
          phone: string
          property_address_postcode: string
          property_address_state?: string | null
          property_address_street: string
          property_address_suburb: string
          property_type?: string | null
          property_zone?: number | null
          quoted_amount?: number | null
          report_pdf_url?: string | null
          scheduled_dates?: string[] | null
          scheduled_time?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
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
          notes?: string | null
          payment_received_date?: string | null
          phone?: string
          property_address_postcode?: string
          property_address_state?: string | null
          property_address_street?: string
          property_address_suburb?: string
          property_type?: string | null
          property_zone?: number | null
          quoted_amount?: number | null
          report_pdf_url?: string | null
          scheduled_dates?: string[] | null
          scheduled_time?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: []
      }
      moisture_readings: {
        Row: {
          area_id: string
          created_at: string | null
          id: string
          moisture_percentage: number
          moisture_status: Database["public"]["Enums"]["moisture_status"] | null
          reading_order: number | null
          title: string | null
        }
        Insert: {
          area_id: string
          created_at?: string | null
          id?: string
          moisture_percentage: number
          moisture_status?:
            | Database["public"]["Enums"]["moisture_status"]
            | null
          reading_order?: number | null
          title?: string | null
        }
        Update: {
          area_id?: string
          created_at?: string | null
          id?: string
          moisture_percentage?: number
          moisture_status?:
            | Database["public"]["Enums"]["moisture_status"]
            | null
          reading_order?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moisture_readings_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "inspection_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          lead_id: string | null
          message: string
          metadata: Json | null
          priority: string | null
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          message: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          message?: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_queue: {
        Row: {
          action_type: string
          conflict_data: Json | null
          created_at: string | null
          device_info: Json | null
          id: string
          last_sync_attempt_at: string | null
          network_info: Json | null
          payload: Json
          priority: number | null
          record_id: string | null
          status: string
          sync_attempts: number | null
          sync_error: string | null
          synced_at: string | null
          table_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          conflict_data?: Json | null
          created_at?: string | null
          device_info?: Json | null
          id?: string
          last_sync_attempt_at?: string | null
          network_info?: Json | null
          payload: Json
          priority?: number | null
          record_id?: string | null
          status?: string
          sync_attempts?: number | null
          sync_error?: string | null
          synced_at?: string | null
          table_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          conflict_data?: Json | null
          created_at?: string | null
          device_info?: Json | null
          id?: string
          last_sync_attempt_at?: string | null
          network_info?: Json | null
          payload?: Json
          priority?: number | null
          record_id?: string | null
          status?: string
          sync_attempts?: number | null
          sync_error?: string | null
          synced_at?: string | null
          table_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      operating_hours: {
        Row: {
          close_time: string | null
          created_at: string | null
          day_of_week: number
          id: string
          is_open: boolean | null
          open_time: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          close_time?: string | null
          created_at?: string | null
          day_of_week: number
          id?: string
          is_open?: boolean | null
          open_time?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          close_time?: string | null
          created_at?: string | null
          day_of_week?: number
          id?: string
          is_open?: boolean | null
          open_time?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      pdf_versions: {
        Row: {
          changes_made: Json | null
          created_at: string | null
          created_by: string | null
          file_size_bytes: number | null
          id: string
          inspection_id: string
          pdf_url: string
          version_number: number
        }
        Insert: {
          changes_made?: Json | null
          created_at?: string | null
          created_by?: string | null
          file_size_bytes?: number | null
          id?: string
          inspection_id: string
          pdf_url: string
          version_number: number
        }
        Update: {
          changes_made?: Json | null
          created_at?: string | null
          created_by?: string | null
          file_size_bytes?: number | null
          id?: string
          inspection_id?: string
          pdf_url?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "pdf_versions_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          area_id: string | null
          caption: string | null
          created_at: string | null
          file_name: string | null
          file_size: number | null
          id: string
          inspection_id: string | null
          mime_type: string | null
          moisture_reading_id: string | null
          order_index: number | null
          photo_type: string
          storage_path: string
          subfloor_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          area_id?: string | null
          caption?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          inspection_id?: string | null
          mime_type?: string | null
          moisture_reading_id?: string | null
          order_index?: number | null
          photo_type: string
          storage_path: string
          subfloor_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          area_id?: string | null
          caption?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          inspection_id?: string | null
          mime_type?: string | null
          moisture_reading_id?: string | null
          order_index?: number | null
          photo_type?: string
          storage_path?: string
          subfloor_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "inspection_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_moisture_reading_id_fkey"
            columns: ["moisture_reading_id"]
            isOneToOne: false
            referencedRelation: "moisture_readings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_subfloor_id_fkey"
            columns: ["subfloor_id"]
            isOneToOne: false
            referencedRelation: "subfloor_data"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_settings: {
        Row: {
          created_at: string | null
          hours_2_rate: number
          hours_8_rate: number
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hours_2_rate: number
          hours_8_rate: number
          id?: string
          job_type: Database["public"]["Enums"]["job_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hours_2_rate?: number
          hours_8_rate?: number
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          cost_cents: number | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          inspection_id: string | null
          lead_id: string | null
          message: string
          message_type: string | null
          metadata: Json | null
          provider: string | null
          provider_message_id: string | null
          recipient_name: string | null
          recipient_phone: string
          sent_at: string | null
          sent_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          cost_cents?: number | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          inspection_id?: string | null
          lead_id?: string | null
          message: string
          message_type?: string | null
          metadata?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          recipient_name?: string | null
          recipient_phone: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          cost_cents?: number | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          inspection_id?: string | null
          lead_id?: string | null
          message?: string
          message_type?: string | null
          metadata?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspection_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      subfloor_data: {
        Row: {
          comments: string | null
          comments_approved: boolean | null
          created_at: string | null
          id: string
          inspection_id: string
          landscape: Database["public"]["Enums"]["subfloor_landscape"] | null
          observations: string | null
          racking_required: boolean | null
          sanitation_required: boolean | null
          treatment_time_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          comments?: string | null
          comments_approved?: boolean | null
          created_at?: string | null
          id?: string
          inspection_id: string
          landscape?: Database["public"]["Enums"]["subfloor_landscape"] | null
          observations?: string | null
          racking_required?: boolean | null
          sanitation_required?: boolean | null
          treatment_time_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          comments?: string | null
          comments_approved?: boolean | null
          created_at?: string | null
          id?: string
          inspection_id?: string
          landscape?: Database["public"]["Enums"]["subfloor_landscape"] | null
          observations?: string | null
          racking_required?: boolean | null
          sanitation_required?: boolean | null
          treatment_time_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subfloor_data_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: true
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      subfloor_readings: {
        Row: {
          created_at: string | null
          id: string
          location: string
          moisture_percentage: number
          reading_order: number | null
          subfloor_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location: string
          moisture_percentage: number
          reading_order?: number | null
          subfloor_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string
          moisture_percentage?: number
          reading_order?: number | null
          subfloor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subfloor_readings_subfloor_id_fkey"
            columns: ["subfloor_id"]
            isOneToOne: false
            referencedRelation: "subfloor_data"
            referencedColumns: ["id"]
          },
        ]
      }
      suburb_zones: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          postcode: string
          region: string | null
          suburb: string
          updated_at: string | null
          zone: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          postcode: string
          region?: string | null
          suburb: string
          updated_at?: string | null
          zone: number
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          postcode?: string
          region?: string | null
          suburb?: string
          updated_at?: string | null
          zone?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_dew_point: {
        Args: { humidity: number; temperature: number }
        Returns: number
      }
      calculate_gst: { Args: { amount_ex_gst: number }; Returns: number }
      calculate_moisture_status: {
        Args: { percentage: number }
        Returns: Database["public"]["Enums"]["moisture_status"]
      }
      calculate_total_inc_gst: {
        Args: { amount_ex_gst: number }
        Returns: number
      }
      calculate_travel_time: {
        Args: { zone_from: number; zone_to: number }
        Returns: number
      }
      check_booking_conflicts: {
        Args: {
          p_end_time: string
          p_exclude_booking_id?: string
          p_start_time: string
          p_technician_ids: string[]
        }
        Returns: {
          booking_id: string
          conflict_end: string
          conflict_start: string
          customer_name: string
          lead_id: string
          property_suburb: string
          technician_id: string
        }[]
      }
      generate_inspection_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_lead_number: { Args: never; Returns: string }
      get_admin_user_ids: {
        Args: never
        Returns: {
          user_id: string
        }[]
      }
      get_pending_sync_items: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          action_type: string
          created_at: string
          payload: Json
          priority: number
          queue_id: string
          record_id: string
          table_name: string
        }[]
      }
      get_suburb_details: {
        Args: { suburb_name: string }
        Returns: {
          notes: string
          postcode: string
          region: string
          suburb: string
          zone: number
        }[]
      }
      get_zone_by_suburb: { Args: { suburb_name: string }; Returns: number }
      has_travel_time_conflict:
        | {
            Args: {
              p_assigned_to: string
              p_end_datetime: string
              p_start_datetime: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_new_start_time: string
              p_new_zone: number
              p_technician_id: string
            }
            Returns: boolean
          }
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
      moisture_status: "dry" | "elevated" | "wet" | "very_wet"
      payment_method: "bank_transfer" | "credit_card" | "cash" | "cheque"
      property_occupation:
        | "tenanted"
        | "vacant"
        | "owner_occupied"
        | "tenants_vacating"
      report_status: "draft" | "sent" | "confirmed" | "job_booked"
      subfloor_landscape: "flat_block" | "sloping_block"
      user_role: "admin" | "technician" | "manager"
      waste_disposal_size: "small" | "medium" | "large" | "extra_large"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "rescheduled",
      ],
      dwelling_type: [
        "house",
        "units",
        "apartment",
        "duplex",
        "townhouse",
        "commercial",
        "construction",
        "industrial",
      ],
      invoice_status: ["draft", "sent", "overdue", "paid", "cancelled"],
      job_type: ["no_demolition_surface", "demo", "construction", "subfloor"],
      lead_status: [
        "hipages_lead",
        "new_lead",
        "contacted",
        "inspection_waiting",
        "approve_inspection_report",
        "inspection_email_approval",
        "inspection_completed",
        "inspection_report_pdf_completed",
        "job_waiting",
        "job_completed",
        "job_report_pdf_sent",
        "invoicing_sent",
        "paid",
        "google_review",
        "finished",
      ],
      moisture_status: ["dry", "elevated", "wet", "very_wet"],
      payment_method: ["bank_transfer", "credit_card", "cash", "cheque"],
      property_occupation: [
        "tenanted",
        "vacant",
        "owner_occupied",
        "tenants_vacating",
      ],
      report_status: ["draft", "sent", "confirmed", "job_booked"],
      subfloor_landscape: ["flat_block", "sloping_block"],
      user_role: ["admin", "technician", "manager"],
      waste_disposal_size: ["small", "medium", "large", "extra_large"],
    },
  },
} as const
