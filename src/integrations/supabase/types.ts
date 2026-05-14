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
      ai_summary_versions: {
        Row: {
          ai_summary_text: string | null
          approved_at: string | null
          approved_by: string | null
          demolition_content: string | null
          generated_at: string | null
          generated_by: string | null
          generation_type: string
          id: string
          inspection_id: string
          model_name: string | null
          model_version: string | null
          problem_analysis_content: string | null
          prompt_tokens: number | null
          regeneration_feedback: string | null
          response_tokens: number | null
          superseded_at: string | null
          superseded_by_version_id: string | null
          system_prompt_hash: string | null
          user_prompt: string | null
          version_number: number
          what_we_found_text: string | null
          what_we_will_do_text: string | null
          what_you_get_text: string | null
        }
        Insert: {
          ai_summary_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          demolition_content?: string | null
          generated_at?: string | null
          generated_by?: string | null
          generation_type: string
          id?: string
          inspection_id: string
          model_name?: string | null
          model_version?: string | null
          problem_analysis_content?: string | null
          prompt_tokens?: number | null
          regeneration_feedback?: string | null
          response_tokens?: number | null
          superseded_at?: string | null
          superseded_by_version_id?: string | null
          system_prompt_hash?: string | null
          user_prompt?: string | null
          version_number: number
          what_we_found_text?: string | null
          what_we_will_do_text?: string | null
          what_you_get_text?: string | null
        }
        Update: {
          ai_summary_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          demolition_content?: string | null
          generated_at?: string | null
          generated_by?: string | null
          generation_type?: string
          id?: string
          inspection_id?: string
          model_name?: string | null
          model_version?: string | null
          problem_analysis_content?: string | null
          prompt_tokens?: number | null
          regeneration_feedback?: string | null
          response_tokens?: number | null
          superseded_at?: string | null
          superseded_by_version_id?: string | null
          system_prompt_hash?: string | null
          user_prompt?: string | null
          version_number?: number
          what_we_found_text?: string | null
          what_we_will_do_text?: string | null
          what_you_get_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_summary_versions_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_summary_versions_superseded_by_version_id_fkey"
            columns: ["superseded_by_version_id"]
            isOneToOne: false
            referencedRelation: "ai_summary_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_summary_versions_superseded_by_version_id_fkey"
            columns: ["superseded_by_version_id"]
            isOneToOne: false
            referencedRelation: "latest_ai_summary"
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
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
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
          reminder_scheduled_for: string | null
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
          reminder_scheduled_for?: string | null
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
          reminder_scheduled_for?: string | null
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
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_bookings_revert_cleanup_backup_20260429: {
        Row: {
          all_day: boolean | null
          assigned_to: string | null
          created_at: string | null
          description: string | null
          end_datetime: string | null
          event_type: string | null
          id: string | null
          inspection_id: string | null
          lead_id: string | null
          location_address: string | null
          reminder_scheduled_for: string | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          start_datetime: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          title: string | null
          travel_from_suburb: string | null
          travel_time_minutes: number | null
          travel_to_suburb: string | null
          updated_at: string | null
        }
        Insert: {
          all_day?: boolean | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          end_datetime?: string | null
          event_type?: string | null
          id?: string | null
          inspection_id?: string | null
          lead_id?: string | null
          location_address?: string | null
          reminder_scheduled_for?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          start_datetime?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          title?: string | null
          travel_from_suburb?: string | null
          travel_time_minutes?: number | null
          travel_to_suburb?: string | null
          updated_at?: string | null
        }
        Update: {
          all_day?: boolean | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          end_datetime?: string | null
          event_type?: string | null
          id?: string | null
          inspection_id?: string | null
          lead_id?: string | null
          location_address?: string | null
          reminder_scheduled_for?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          start_datetime?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          title?: string | null
          travel_from_suburb?: string | null
          travel_time_minutes?: number | null
          travel_to_suburb?: string | null
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
            referencedRelation: "inspections"
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
      error_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          error_type: string
          id: string
          message: string
          resolved: boolean | null
          severity: string | null
          source: string | null
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          error_type: string
          id?: string
          message: string
          resolved?: boolean | null
          severity?: string | null
          source?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          error_type?: string
          id?: string
          message?: string
          resolved?: boolean | null
          severity?: string | null
          source?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      inspection_areas: {
        Row: {
          area_name: string
          area_order: number | null
          comments: string | null
          created_at: string | null
          demolition_description: string | null
          demolition_required: boolean | null
          demolition_time_minutes: number | null
          dew_point: number | null
          external_moisture: number | null
          extra_notes: string | null
          humidity: number | null
          id: string
          infrared_enabled: boolean | null
          infrared_observation_condensation: boolean | null
          infrared_observation_missing_insulation: boolean | null
          infrared_observation_no_active: boolean | null
          infrared_observation_past_ingress: boolean | null
          infrared_observation_water_infiltration: boolean | null
          inspection_id: string
          internal_moisture: number | null
          internal_office_notes: string | null
          job_time_minutes: number
          mould_description: string | null
          mould_visible_custom: string | null
          mould_visible_locations: Json | null
          primary_photo_id: string | null
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          area_name: string
          area_order?: number | null
          comments?: string | null
          created_at?: string | null
          demolition_description?: string | null
          demolition_required?: boolean | null
          demolition_time_minutes?: number | null
          dew_point?: number | null
          external_moisture?: number | null
          extra_notes?: string | null
          humidity?: number | null
          id?: string
          infrared_enabled?: boolean | null
          infrared_observation_condensation?: boolean | null
          infrared_observation_missing_insulation?: boolean | null
          infrared_observation_no_active?: boolean | null
          infrared_observation_past_ingress?: boolean | null
          infrared_observation_water_infiltration?: boolean | null
          inspection_id: string
          internal_moisture?: number | null
          internal_office_notes?: string | null
          job_time_minutes: number
          mould_description?: string | null
          mould_visible_custom?: string | null
          mould_visible_locations?: Json | null
          primary_photo_id?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          area_name?: string
          area_order?: number | null
          comments?: string | null
          created_at?: string | null
          demolition_description?: string | null
          demolition_required?: boolean | null
          demolition_time_minutes?: number | null
          dew_point?: number | null
          external_moisture?: number | null
          extra_notes?: string | null
          humidity?: number | null
          id?: string
          infrared_enabled?: boolean | null
          infrared_observation_condensation?: boolean | null
          infrared_observation_missing_insulation?: boolean | null
          infrared_observation_no_active?: boolean | null
          infrared_observation_past_ingress?: boolean | null
          infrared_observation_water_infiltration?: boolean | null
          inspection_id?: string
          internal_moisture?: number | null
          internal_office_notes?: string | null
          job_time_minutes?: number
          mould_description?: string | null
          mould_visible_custom?: string | null
          mould_visible_locations?: Json | null
          primary_photo_id?: string | null
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
          {
            foreignKeyName: "inspection_areas_primary_photo_id_fkey"
            columns: ["primary_photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_areas_dead_col_drop_backup_20260513: {
        Row: {
          comments_approved: boolean | null
          id: string | null
          moisture_readings_enabled: boolean | null
          mould_ceiling: boolean | null
          mould_contents: boolean | null
          mould_cornice: boolean | null
          mould_cupboard: boolean | null
          mould_flooring: boolean | null
          mould_grout_silicone: boolean | null
          mould_none_visible: boolean | null
          mould_skirting: boolean | null
          mould_walls: boolean | null
          mould_wardrobe: boolean | null
          mould_window_furnishings: boolean | null
          mould_windows: boolean | null
          snapshot_at: string | null
        }
        Insert: {
          comments_approved?: boolean | null
          id?: string | null
          moisture_readings_enabled?: boolean | null
          mould_ceiling?: boolean | null
          mould_contents?: boolean | null
          mould_cornice?: boolean | null
          mould_cupboard?: boolean | null
          mould_flooring?: boolean | null
          mould_grout_silicone?: boolean | null
          mould_none_visible?: boolean | null
          mould_skirting?: boolean | null
          mould_walls?: boolean | null
          mould_wardrobe?: boolean | null
          mould_window_furnishings?: boolean | null
          mould_windows?: boolean | null
          snapshot_at?: string | null
        }
        Update: {
          comments_approved?: boolean | null
          id?: string | null
          moisture_readings_enabled?: boolean | null
          mould_ceiling?: boolean | null
          mould_contents?: boolean | null
          mould_cornice?: boolean | null
          mould_cupboard?: boolean | null
          mould_flooring?: boolean | null
          mould_grout_silicone?: boolean | null
          mould_none_visible?: boolean | null
          mould_skirting?: boolean | null
          mould_walls?: boolean | null
          mould_wardrobe?: boolean | null
          mould_window_furnishings?: boolean | null
          mould_windows?: boolean | null
          snapshot_at?: string | null
        }
        Relationships: []
      }
      inspections: {
        Row: {
          additional_equipment_comments: string | null
          additional_info_technician: string | null
          air_movers_qty: number | null
          antimicrobial: boolean | null
          attention_to: string | null
          cause_of_mould: string | null
          commercial_dehumidifier_qty: number | null
          contributing_factors: string | null
          created_at: string | null
          demolition_hours: number | null
          direction_photos_enabled: boolean | null
          discount_percent: number | null
          dwelling_type: Database["public"]["Enums"]["dwelling_type"] | null
          equipment_cost_ex_gst: number | null
          equipment_days: number | null
          gst_amount: number | null
          hepa_vac: boolean | null
          home_sanitation_fogging: boolean | null
          id: string
          identified_causes: string | null
          immediate_actions: string | null
          inspection_date: string
          inspector_id: string
          inspector_name: string | null
          job_number: string | null
          labour_cost_ex_gst: number | null
          last_edited_at: string | null
          last_edited_by: string | null
          lead_id: string
          long_term_protection: string | null
          manual_labour_override: boolean | null
          manual_total_inc_gst: number | null
          no_demolition_hours: number | null
          option_1_equipment_ex_gst: number | null
          option_1_labour_ex_gst: number | null
          option_1_total_inc_gst: number | null
          option_2_total_inc_gst: number | null
          option_selected: number | null
          outdoor_comments: string | null
          outdoor_dew_point: number | null
          outdoor_humidity: number | null
          outdoor_temperature: number | null
          parking_option: string | null
          pdf_approved: boolean | null
          pdf_approved_at: string | null
          pdf_approved_by: string | null
          pdf_blob_url: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          pdf_version: number | null
          property_occupation:
            | Database["public"]["Enums"]["property_occupation"]
            | null
          rcd_box_qty: number | null
          recommended_dehumidifier: string | null
          report_generated: boolean | null
          report_pdf_url: string | null
          report_sent_date: string | null
          requested_by: string | null
          stain_removing_antimicrobial: boolean | null
          subfloor_hours: number | null
          subtotal_ex_gst: number | null
          timeline_text: string | null
          total_inc_gst: number | null
          total_time_minutes: number | null
          treatment_methods: string[] | null
          triage_description: string | null
          updated_at: string | null
          waste_disposal_amount: string | null
          waste_disposal_cost: number | null
          waste_disposal_required: boolean | null
          what_success_looks_like: string | null
          what_we_discovered: string | null
          why_this_happened: string | null
        }
        Insert: {
          additional_equipment_comments?: string | null
          additional_info_technician?: string | null
          air_movers_qty?: number | null
          antimicrobial?: boolean | null
          attention_to?: string | null
          cause_of_mould?: string | null
          commercial_dehumidifier_qty?: number | null
          contributing_factors?: string | null
          created_at?: string | null
          demolition_hours?: number | null
          direction_photos_enabled?: boolean | null
          discount_percent?: number | null
          dwelling_type?: Database["public"]["Enums"]["dwelling_type"] | null
          equipment_cost_ex_gst?: number | null
          equipment_days?: number | null
          gst_amount?: number | null
          hepa_vac?: boolean | null
          home_sanitation_fogging?: boolean | null
          id?: string
          identified_causes?: string | null
          immediate_actions?: string | null
          inspection_date: string
          inspector_id: string
          inspector_name?: string | null
          job_number?: string | null
          labour_cost_ex_gst?: number | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          lead_id: string
          long_term_protection?: string | null
          manual_labour_override?: boolean | null
          manual_total_inc_gst?: number | null
          no_demolition_hours?: number | null
          option_1_equipment_ex_gst?: number | null
          option_1_labour_ex_gst?: number | null
          option_1_total_inc_gst?: number | null
          option_2_total_inc_gst?: number | null
          option_selected?: number | null
          outdoor_comments?: string | null
          outdoor_dew_point?: number | null
          outdoor_humidity?: number | null
          outdoor_temperature?: number | null
          parking_option?: string | null
          pdf_approved?: boolean | null
          pdf_approved_at?: string | null
          pdf_approved_by?: string | null
          pdf_blob_url?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          pdf_version?: number | null
          property_occupation?:
            | Database["public"]["Enums"]["property_occupation"]
            | null
          rcd_box_qty?: number | null
          recommended_dehumidifier?: string | null
          report_generated?: boolean | null
          report_pdf_url?: string | null
          report_sent_date?: string | null
          requested_by?: string | null
          stain_removing_antimicrobial?: boolean | null
          subfloor_hours?: number | null
          subtotal_ex_gst?: number | null
          timeline_text?: string | null
          total_inc_gst?: number | null
          total_time_minutes?: number | null
          treatment_methods?: string[] | null
          triage_description?: string | null
          updated_at?: string | null
          waste_disposal_amount?: string | null
          waste_disposal_cost?: number | null
          waste_disposal_required?: boolean | null
          what_success_looks_like?: string | null
          what_we_discovered?: string | null
          why_this_happened?: string | null
        }
        Update: {
          additional_equipment_comments?: string | null
          additional_info_technician?: string | null
          air_movers_qty?: number | null
          antimicrobial?: boolean | null
          attention_to?: string | null
          cause_of_mould?: string | null
          commercial_dehumidifier_qty?: number | null
          contributing_factors?: string | null
          created_at?: string | null
          demolition_hours?: number | null
          direction_photos_enabled?: boolean | null
          discount_percent?: number | null
          dwelling_type?: Database["public"]["Enums"]["dwelling_type"] | null
          equipment_cost_ex_gst?: number | null
          equipment_days?: number | null
          gst_amount?: number | null
          hepa_vac?: boolean | null
          home_sanitation_fogging?: boolean | null
          id?: string
          identified_causes?: string | null
          immediate_actions?: string | null
          inspection_date?: string
          inspector_id?: string
          inspector_name?: string | null
          job_number?: string | null
          labour_cost_ex_gst?: number | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          lead_id?: string
          long_term_protection?: string | null
          manual_labour_override?: boolean | null
          manual_total_inc_gst?: number | null
          no_demolition_hours?: number | null
          option_1_equipment_ex_gst?: number | null
          option_1_labour_ex_gst?: number | null
          option_1_total_inc_gst?: number | null
          option_2_total_inc_gst?: number | null
          option_selected?: number | null
          outdoor_comments?: string | null
          outdoor_dew_point?: number | null
          outdoor_humidity?: number | null
          outdoor_temperature?: number | null
          parking_option?: string | null
          pdf_approved?: boolean | null
          pdf_approved_at?: string | null
          pdf_approved_by?: string | null
          pdf_blob_url?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          pdf_version?: number | null
          property_occupation?:
            | Database["public"]["Enums"]["property_occupation"]
            | null
          rcd_box_qty?: number | null
          recommended_dehumidifier?: string | null
          report_generated?: boolean | null
          report_pdf_url?: string | null
          report_sent_date?: string | null
          requested_by?: string | null
          stain_removing_antimicrobial?: boolean | null
          subfloor_hours?: number | null
          subtotal_ex_gst?: number | null
          timeline_text?: string | null
          total_inc_gst?: number | null
          total_time_minutes?: number | null
          treatment_methods?: string[] | null
          triage_description?: string | null
          updated_at?: string | null
          waste_disposal_amount?: string | null
          waste_disposal_cost?: number | null
          waste_disposal_required?: boolean | null
          what_success_looks_like?: string | null
          what_we_discovered?: string | null
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
      inspections_dead_col_drop_backup_20260513: {
        Row: {
          air_mover_rate: number | null
          air_movers_enabled: boolean | null
          commercial_dehumidifier_enabled: boolean | null
          construction_hours: number | null
          dehumidifier_rate: number | null
          demo_labour_rate: number | null
          drying_equipment_enabled: boolean | null
          equipment_cost_inc_gst: number | null
          estimated_cost_ex_gst: number | null
          estimated_cost_inc_gst: number | null
          id: string | null
          inspection_start_time: string | null
          manual_price_override: boolean | null
          non_demo_labour_rate: number | null
          property_address_snapshot: string | null
          rcd_box_enabled: boolean | null
          rcd_rate: number | null
          selected_job_type: string | null
          snapshot_at: string | null
          subfloor_labour_rate: number | null
          subfloor_required: boolean | null
        }
        Insert: {
          air_mover_rate?: number | null
          air_movers_enabled?: boolean | null
          commercial_dehumidifier_enabled?: boolean | null
          construction_hours?: number | null
          dehumidifier_rate?: number | null
          demo_labour_rate?: number | null
          drying_equipment_enabled?: boolean | null
          equipment_cost_inc_gst?: number | null
          estimated_cost_ex_gst?: number | null
          estimated_cost_inc_gst?: number | null
          id?: string | null
          inspection_start_time?: string | null
          manual_price_override?: boolean | null
          non_demo_labour_rate?: number | null
          property_address_snapshot?: string | null
          rcd_box_enabled?: boolean | null
          rcd_rate?: number | null
          selected_job_type?: string | null
          snapshot_at?: string | null
          subfloor_labour_rate?: number | null
          subfloor_required?: boolean | null
        }
        Update: {
          air_mover_rate?: number | null
          air_movers_enabled?: boolean | null
          commercial_dehumidifier_enabled?: boolean | null
          construction_hours?: number | null
          dehumidifier_rate?: number | null
          demo_labour_rate?: number | null
          drying_equipment_enabled?: boolean | null
          equipment_cost_inc_gst?: number | null
          estimated_cost_ex_gst?: number | null
          estimated_cost_inc_gst?: number | null
          id?: string | null
          inspection_start_time?: string | null
          manual_price_override?: boolean | null
          non_demo_labour_rate?: number | null
          property_address_snapshot?: string | null
          rcd_box_enabled?: boolean | null
          rcd_rate?: number | null
          selected_job_type?: string | null
          snapshot_at?: string | null
          subfloor_labour_rate?: number | null
          subfloor_required?: boolean | null
        }
        Relationships: []
      }
      inspections_discount_backfill_backup_20260513: {
        Row: {
          discount_percent: number | null
          id: string | null
          snapshot_at: string | null
        }
        Insert: {
          discount_percent?: number | null
          id?: string | null
          snapshot_at?: string | null
        }
        Update: {
          discount_percent?: number | null
          id?: string | null
          snapshot_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          discount_amount: number | null
          discount_percentage: number | null
          due_date: string
          equipment_subtotal: number | null
          gst_amount: number
          id: string
          invoice_date: string
          invoice_number: string
          job_completion_id: string | null
          lead_id: string | null
          line_items: Json
          notes: string | null
          paid_at: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          property_address: string | null
          sent_at: string | null
          status: string
          subtotal: number
          subtotal_after_discount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          due_date: string
          equipment_subtotal?: number | null
          gst_amount?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          job_completion_id?: string | null
          lead_id?: string | null
          line_items?: Json
          notes?: string | null
          paid_at?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          property_address?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          subtotal_after_discount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          due_date?: string
          equipment_subtotal?: number | null
          gst_amount?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          job_completion_id?: string | null
          lead_id?: string | null
          line_items?: Json
          notes?: string | null
          paid_at?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          property_address?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          subtotal_after_discount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_job_completion_id_fkey"
            columns: ["job_completion_id"]
            isOneToOne: false
            referencedRelation: "job_completions"
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
      job_completion_pdf_versions: {
        Row: {
          created_at: string
          generated_by: string | null
          id: string
          job_completion_id: string
          pdf_url: string
          version_number: number
        }
        Insert: {
          created_at?: string
          generated_by?: string | null
          id?: string
          job_completion_id: string
          pdf_url: string
          version_number?: number
        }
        Update: {
          created_at?: string
          generated_by?: string | null
          id?: string
          job_completion_id?: string
          pdf_url?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_completion_pdf_versions_job_completion_id_fkey"
            columns: ["job_completion_id"]
            isOneToOne: false
            referencedRelation: "job_completions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_completions: {
        Row: {
          actual_afd_days: number
          actual_afd_qty: number
          actual_air_mover_days: number
          actual_air_mover_qty: number
          actual_dehumidifier_days: number
          actual_dehumidifier_qty: number
          actual_rcd_days: number
          actual_rcd_qty: number
          additional_notes: string | null
          address_snapshot: string | null
          areas_treated: string[] | null
          attention_to: string | null
          chemical_air_filtration: boolean
          chemical_hepa_vacuumed: boolean
          chemical_sanitised_premises: boolean
          chemical_sodium_hypochlorite: boolean
          chemical_water_based: boolean
          completed_by: string
          completion_date: string
          created_at: string
          damages_details: string | null
          damages_present: boolean
          demolition_justification: string | null
          demolition_removal_notes: string | null
          demolition_works: boolean
          followup_required: boolean
          id: string
          inspection_id: string | null
          job_number: string | null
          lead_id: string
          method_afd_installation: boolean
          method_cavity_treatment: boolean
          method_containment_prv: boolean
          method_debris_removal: boolean
          method_drying_equipment: boolean
          method_hepa_vacuuming: boolean
          method_material_demolition: boolean
          method_subfloor_remediation: boolean
          method_surface_mould_remediation: boolean
          method_ulv_fogging_property: boolean
          method_ulv_fogging_subfloor: boolean
          office_notes: string | null
          pdf_approved: boolean
          pdf_approved_at: string | null
          pdf_approved_by: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          pdf_version: number
          premises_type: string | null
          quoted_air_mover_qty: number
          quoted_dehumidifier_qty: number
          quoted_equipment_days: number
          quoted_rcd_qty: number
          remediation_completed_by: string | null
          request_review: boolean
          requested_by: string | null
          scope_changed: boolean
          scope_extra_work: string | null
          scope_reduced: string | null
          scope_what_changed: string | null
          scope_why_changed: string | null
          staining_details: string | null
          staining_present: boolean
          status: string
          submitted_at: string | null
          swms_completed: boolean
          updated_at: string
        }
        Insert: {
          actual_afd_days?: number
          actual_afd_qty?: number
          actual_air_mover_days?: number
          actual_air_mover_qty?: number
          actual_dehumidifier_days?: number
          actual_dehumidifier_qty?: number
          actual_rcd_days?: number
          actual_rcd_qty?: number
          additional_notes?: string | null
          address_snapshot?: string | null
          areas_treated?: string[] | null
          attention_to?: string | null
          chemical_air_filtration?: boolean
          chemical_hepa_vacuumed?: boolean
          chemical_sanitised_premises?: boolean
          chemical_sodium_hypochlorite?: boolean
          chemical_water_based?: boolean
          completed_by: string
          completion_date?: string
          created_at?: string
          damages_details?: string | null
          damages_present?: boolean
          demolition_justification?: string | null
          demolition_removal_notes?: string | null
          demolition_works?: boolean
          followup_required?: boolean
          id?: string
          inspection_id?: string | null
          job_number?: string | null
          lead_id: string
          method_afd_installation?: boolean
          method_cavity_treatment?: boolean
          method_containment_prv?: boolean
          method_debris_removal?: boolean
          method_drying_equipment?: boolean
          method_hepa_vacuuming?: boolean
          method_material_demolition?: boolean
          method_subfloor_remediation?: boolean
          method_surface_mould_remediation?: boolean
          method_ulv_fogging_property?: boolean
          method_ulv_fogging_subfloor?: boolean
          office_notes?: string | null
          pdf_approved?: boolean
          pdf_approved_at?: string | null
          pdf_approved_by?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          pdf_version?: number
          premises_type?: string | null
          quoted_air_mover_qty?: number
          quoted_dehumidifier_qty?: number
          quoted_equipment_days?: number
          quoted_rcd_qty?: number
          remediation_completed_by?: string | null
          request_review?: boolean
          requested_by?: string | null
          scope_changed?: boolean
          scope_extra_work?: string | null
          scope_reduced?: string | null
          scope_what_changed?: string | null
          scope_why_changed?: string | null
          staining_details?: string | null
          staining_present?: boolean
          status?: string
          submitted_at?: string | null
          swms_completed?: boolean
          updated_at?: string
        }
        Update: {
          actual_afd_days?: number
          actual_afd_qty?: number
          actual_air_mover_days?: number
          actual_air_mover_qty?: number
          actual_dehumidifier_days?: number
          actual_dehumidifier_qty?: number
          actual_rcd_days?: number
          actual_rcd_qty?: number
          additional_notes?: string | null
          address_snapshot?: string | null
          areas_treated?: string[] | null
          attention_to?: string | null
          chemical_air_filtration?: boolean
          chemical_hepa_vacuumed?: boolean
          chemical_sanitised_premises?: boolean
          chemical_sodium_hypochlorite?: boolean
          chemical_water_based?: boolean
          completed_by?: string
          completion_date?: string
          created_at?: string
          damages_details?: string | null
          damages_present?: boolean
          demolition_justification?: string | null
          demolition_removal_notes?: string | null
          demolition_works?: boolean
          followup_required?: boolean
          id?: string
          inspection_id?: string | null
          job_number?: string | null
          lead_id?: string
          method_afd_installation?: boolean
          method_cavity_treatment?: boolean
          method_containment_prv?: boolean
          method_debris_removal?: boolean
          method_drying_equipment?: boolean
          method_hepa_vacuuming?: boolean
          method_material_demolition?: boolean
          method_subfloor_remediation?: boolean
          method_surface_mould_remediation?: boolean
          method_ulv_fogging_property?: boolean
          method_ulv_fogging_subfloor?: boolean
          office_notes?: string | null
          pdf_approved?: boolean
          pdf_approved_at?: string | null
          pdf_approved_by?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          pdf_version?: number
          premises_type?: string | null
          quoted_air_mover_qty?: number
          quoted_dehumidifier_qty?: number
          quoted_equipment_days?: number
          quoted_rcd_qty?: number
          remediation_completed_by?: string | null
          request_review?: boolean
          requested_by?: string | null
          scope_changed?: boolean
          scope_extra_work?: string | null
          scope_reduced?: string | null
          scope_what_changed?: string | null
          scope_why_changed?: string | null
          staining_details?: string | null
          staining_present?: boolean
          status?: string
          submitted_at?: string | null
          swms_completed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_completions_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_completions_lead_id_fkey"
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
          archived_at: string | null
          assigned_to: string | null
          booked_at: string | null
          created_at: string | null
          created_by: string | null
          customer_preferred_date: string | null
          customer_preferred_time: string | null
          email: string
          full_name: string
          id: string
          inspection_completed_date: string | null
          inspection_scheduled_date: string | null
          internal_notes: string | null
          invoice_amount: number | null
          invoice_sent_date: string | null
          is_possible_duplicate: boolean | null
          issue_description: string | null
          job_completed_date: string | null
          job_scheduled_date: string | null
          lead_number: string | null
          lead_source: string | null
          lead_source_other: string | null
          notes: string | null
          payment_received_date: string | null
          phone: string
          possible_duplicate_of: string | null
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
          search_text: string | null
          special_requests: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string | null
        }
        Insert: {
          access_instructions?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          booked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_preferred_date?: string | null
          customer_preferred_time?: string | null
          email: string
          full_name: string
          id?: string
          inspection_completed_date?: string | null
          inspection_scheduled_date?: string | null
          internal_notes?: string | null
          invoice_amount?: number | null
          invoice_sent_date?: string | null
          is_possible_duplicate?: boolean | null
          issue_description?: string | null
          job_completed_date?: string | null
          job_scheduled_date?: string | null
          lead_number?: string | null
          lead_source?: string | null
          lead_source_other?: string | null
          notes?: string | null
          payment_received_date?: string | null
          phone: string
          possible_duplicate_of?: string | null
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
          search_text?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string | null
        }
        Update: {
          access_instructions?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          booked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_preferred_date?: string | null
          customer_preferred_time?: string | null
          email?: string
          full_name?: string
          id?: string
          inspection_completed_date?: string | null
          inspection_scheduled_date?: string | null
          internal_notes?: string | null
          invoice_amount?: number | null
          invoice_sent_date?: string | null
          is_possible_duplicate?: boolean | null
          issue_description?: string | null
          job_completed_date?: string | null
          job_scheduled_date?: string | null
          lead_number?: string | null
          lead_source?: string | null
          lead_source_other?: string | null
          notes?: string | null
          payment_received_date?: string | null
          phone?: string
          possible_duplicate_of?: string | null
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
          search_text?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_possible_duplicate_of_fkey"
            columns: ["possible_duplicate_of"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_backup_20260428: {
        Row: {
          access_instructions: string | null
          archived_at: string | null
          assigned_to: string | null
          booked_at: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          full_name: string | null
          id: string | null
          inspection_completed_date: string | null
          inspection_scheduled_date: string | null
          internal_notes: string | null
          invoice_amount: number | null
          invoice_sent_date: string | null
          is_possible_duplicate: boolean | null
          issue_description: string | null
          job_completed_date: string | null
          job_scheduled_date: string | null
          lead_number: string | null
          lead_source: string | null
          lead_source_other: string | null
          notes: string | null
          payment_received_date: string | null
          phone: string | null
          possible_duplicate_of: string | null
          property_address_postcode: string | null
          property_address_state: string | null
          property_address_street: string | null
          property_address_suburb: string | null
          property_lat: number | null
          property_lng: number | null
          property_type: string | null
          property_zone: number | null
          quoted_amount: number | null
          report_pdf_url: string | null
          scheduled_dates: string[] | null
          scheduled_time: string | null
          search_text: string | null
          special_requests: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          access_instructions?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          booked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          inspection_completed_date?: string | null
          inspection_scheduled_date?: string | null
          internal_notes?: string | null
          invoice_amount?: number | null
          invoice_sent_date?: string | null
          is_possible_duplicate?: boolean | null
          issue_description?: string | null
          job_completed_date?: string | null
          job_scheduled_date?: string | null
          lead_number?: string | null
          lead_source?: string | null
          lead_source_other?: string | null
          notes?: string | null
          payment_received_date?: string | null
          phone?: string | null
          possible_duplicate_of?: string | null
          property_address_postcode?: string | null
          property_address_state?: string | null
          property_address_street?: string | null
          property_address_suburb?: string | null
          property_lat?: number | null
          property_lng?: number | null
          property_type?: string | null
          property_zone?: number | null
          quoted_amount?: number | null
          report_pdf_url?: string | null
          scheduled_dates?: string[] | null
          scheduled_time?: string | null
          search_text?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          access_instructions?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          booked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          inspection_completed_date?: string | null
          inspection_scheduled_date?: string | null
          internal_notes?: string | null
          invoice_amount?: number | null
          invoice_sent_date?: string | null
          is_possible_duplicate?: boolean | null
          issue_description?: string | null
          job_completed_date?: string | null
          job_scheduled_date?: string | null
          lead_number?: string | null
          lead_source?: string | null
          lead_source_other?: string | null
          notes?: string | null
          payment_received_date?: string | null
          phone?: string | null
          possible_duplicate_of?: string | null
          property_address_postcode?: string | null
          property_address_state?: string | null
          property_address_street?: string | null
          property_address_suburb?: string | null
          property_lat?: number | null
          property_lng?: number | null
          property_type?: string | null
          property_zone?: number | null
          quoted_amount?: number | null
          report_pdf_url?: string | null
          scheduled_dates?: string[] | null
          scheduled_time?: string | null
          search_text?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: []
      }
      leads_dead_col_drop_backup_20260513: {
        Row: {
          id: string | null
          snapshot_at: string | null
          urgency: string | null
        }
        Insert: {
          id?: string | null
          snapshot_at?: string | null
          urgency?: string | null
        }
        Update: {
          id?: string | null
          snapshot_at?: string | null
          urgency?: string | null
        }
        Relationships: []
      }
      leads_revert_cleanup_backup_20260429: {
        Row: {
          access_instructions: string | null
          archived_at: string | null
          assigned_to: string | null
          booked_at: string | null
          created_at: string | null
          created_by: string | null
          customer_preferred_date: string | null
          customer_preferred_time: string | null
          email: string | null
          full_name: string | null
          id: string | null
          inspection_completed_date: string | null
          inspection_scheduled_date: string | null
          internal_notes: string | null
          invoice_amount: number | null
          invoice_sent_date: string | null
          is_possible_duplicate: boolean | null
          issue_description: string | null
          job_completed_date: string | null
          job_scheduled_date: string | null
          lead_number: string | null
          lead_source: string | null
          lead_source_other: string | null
          notes: string | null
          payment_received_date: string | null
          phone: string | null
          possible_duplicate_of: string | null
          property_address_postcode: string | null
          property_address_state: string | null
          property_address_street: string | null
          property_address_suburb: string | null
          property_lat: number | null
          property_lng: number | null
          property_type: string | null
          property_zone: number | null
          quoted_amount: number | null
          report_pdf_url: string | null
          scheduled_dates: string[] | null
          scheduled_time: string | null
          search_text: string | null
          special_requests: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          access_instructions?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          booked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_preferred_date?: string | null
          customer_preferred_time?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          inspection_completed_date?: string | null
          inspection_scheduled_date?: string | null
          internal_notes?: string | null
          invoice_amount?: number | null
          invoice_sent_date?: string | null
          is_possible_duplicate?: boolean | null
          issue_description?: string | null
          job_completed_date?: string | null
          job_scheduled_date?: string | null
          lead_number?: string | null
          lead_source?: string | null
          lead_source_other?: string | null
          notes?: string | null
          payment_received_date?: string | null
          phone?: string | null
          possible_duplicate_of?: string | null
          property_address_postcode?: string | null
          property_address_state?: string | null
          property_address_street?: string | null
          property_address_suburb?: string | null
          property_lat?: number | null
          property_lng?: number | null
          property_type?: string | null
          property_zone?: number | null
          quoted_amount?: number | null
          report_pdf_url?: string | null
          scheduled_dates?: string[] | null
          scheduled_time?: string | null
          search_text?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          access_instructions?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          booked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_preferred_date?: string | null
          customer_preferred_time?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          inspection_completed_date?: string | null
          inspection_scheduled_date?: string | null
          internal_notes?: string | null
          invoice_amount?: number | null
          invoice_sent_date?: string | null
          is_possible_duplicate?: boolean | null
          issue_description?: string | null
          job_completed_date?: string | null
          job_scheduled_date?: string | null
          lead_number?: string | null
          lead_source?: string | null
          lead_source_other?: string | null
          notes?: string | null
          payment_received_date?: string | null
          phone?: string | null
          possible_duplicate_of?: string | null
          property_address_postcode?: string | null
          property_address_state?: string | null
          property_address_street?: string | null
          property_address_suburb?: string | null
          property_lat?: number | null
          property_lng?: number | null
          property_type?: string | null
          property_zone?: number | null
          quoted_amount?: number | null
          report_pdf_url?: string | null
          scheduled_dates?: string[] | null
          scheduled_time?: string | null
          search_text?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: []
      }
      leads_source_backfill_backup_20260514: {
        Row: {
          id: string | null
          lead_source: string | null
          snapshot_at: string | null
        }
        Insert: {
          id?: string | null
          lead_source?: string | null
          snapshot_at?: string | null
        }
        Update: {
          id?: string | null
          lead_source?: string | null
          snapshot_at?: string | null
        }
        Relationships: []
      }
      login_activity: {
        Row: {
          browser: string | null
          browser_version: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_fingerprint: string | null
          device_type: string | null
          email: string
          error_message: string | null
          id: string
          ip_address: string | null
          os: string | null
          os_version: string | null
          region: string | null
          success: boolean
          timezone: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          device_type?: string | null
          email: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          os_version?: string | null
          region?: string | null
          success?: boolean
          timezone?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          device_type?: string | null
          email?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          os_version?: string | null
          region?: string | null
          success?: boolean
          timezone?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      moisture_readings: {
        Row: {
          area_id: string
          created_at: string | null
          id: string
          moisture_percentage: number
          reading_order: number | null
          title: string | null
        }
        Insert: {
          area_id: string
          created_at?: string | null
          id?: string
          moisture_percentage: number
          reading_order?: number | null
          title?: string | null
        }
        Update: {
          area_id?: string
          created_at?: string | null
          id?: string
          moisture_percentage?: number
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
      moisture_readings_dead_col_drop_backup_20260513: {
        Row: {
          id: string | null
          moisture_status: string | null
          snapshot_at: string | null
        }
        Insert: {
          id?: string | null
          moisture_status?: string | null
          snapshot_at?: string | null
        }
        Update: {
          id?: string | null
          moisture_status?: string | null
          snapshot_at?: string | null
        }
        Relationships: []
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
      photo_history: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          changed_at: string | null
          changed_by: string | null
          id: string
          inspection_id: string
          photo_id: string
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          inspection_id: string
          photo_id: string
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          inspection_id?: string
          photo_id?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          area_id: string | null
          caption: string | null
          created_at: string | null
          deleted_at: string | null
          file_name: string | null
          file_size: number | null
          id: string
          inspection_id: string | null
          job_completion_id: string | null
          mime_type: string | null
          moisture_reading_id: string | null
          order_index: number | null
          photo_category: string | null
          photo_type: string
          storage_path: string
          subfloor_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          area_id?: string | null
          caption?: string | null
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          inspection_id?: string | null
          job_completion_id?: string | null
          mime_type?: string | null
          moisture_reading_id?: string | null
          order_index?: number | null
          photo_category?: string | null
          photo_type: string
          storage_path: string
          subfloor_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          area_id?: string | null
          caption?: string | null
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          inspection_id?: string | null
          job_completion_id?: string | null
          mime_type?: string | null
          moisture_reading_id?: string | null
          order_index?: number | null
          photo_category?: string | null
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
            foreignKeyName: "photos_job_completion_id_fkey"
            columns: ["job_completion_id"]
            isOneToOne: false
            referencedRelation: "job_completions"
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
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_skipped: boolean | null
          onboarding_step: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_skipped?: boolean | null
          onboarding_step?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_skipped?: boolean | null
          onboarding_step?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      subfloor_data: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          inspection_id: string
          landscape: Database["public"]["Enums"]["subfloor_landscape"] | null
          observations: string | null
          sanitation_required: boolean | null
          treatment_time_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          inspection_id: string
          landscape?: Database["public"]["Enums"]["subfloor_landscape"] | null
          observations?: string | null
          sanitation_required?: boolean | null
          treatment_time_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          inspection_id?: string
          landscape?: Database["public"]["Enums"]["subfloor_landscape"] | null
          observations?: string | null
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
      subfloor_data_dead_col_drop_backup_20260513: {
        Row: {
          id: string | null
          racking_required: boolean | null
          snapshot_at: string | null
        }
        Insert: {
          id?: string | null
          racking_required?: boolean | null
          snapshot_at?: string | null
        }
        Update: {
          id?: string | null
          racking_required?: boolean | null
          snapshot_at?: string | null
        }
        Relationships: []
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
      suspicious_activity: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          details: Json | null
          id: string
          login_activity_id: string | null
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          login_activity_id?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          login_activity_id?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suspicious_activity_login_activity_id_fkey"
            columns: ["login_activity_id"]
            isOneToOne: false
            referencedRelation: "login_activity"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          browser: string | null
          created_at: string | null
          device_fingerprint: string
          device_name: string | null
          device_type: string | null
          first_ip: string | null
          first_location: string | null
          id: string
          is_current: boolean | null
          is_trusted: boolean | null
          last_used_at: string | null
          os: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_fingerprint: string
          device_name?: string | null
          device_type?: string | null
          first_ip?: string | null
          first_location?: string | null
          id?: string
          is_current?: boolean | null
          is_trusted?: boolean | null
          last_used_at?: string | null
          os?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_fingerprint?: string
          device_name?: string | null
          device_type?: string | null
          first_ip?: string | null
          first_location?: string | null
          id?: string
          is_current?: boolean | null
          is_trusted?: boolean | null
          last_used_at?: string | null
          os?: string | null
          user_id?: string
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
      user_sessions: {
        Row: {
          created_at: string | null
          device_id: string | null
          end_reason: string | null
          ended_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity_at: string | null
          location: string | null
          session_token: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          location?: string | null
          session_token: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          location?: string | null
          session_token?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_submissions: {
        Row: {
          created_at: string
          error_message: string | null
          headers: Json | null
          id: string
          ip_address: string | null
          lead_id: string | null
          processed_at: string | null
          raw_payload: Json
          retry_count: number
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          headers?: Json | null
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          processed_at?: string | null
          raw_payload: Json
          retry_count?: number
          source?: string
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          headers?: Json | null
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          processed_at?: string | null
          raw_payload?: Json
          retry_count?: number
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      latest_ai_summary: {
        Row: {
          ai_summary_text: string | null
          approved_at: string | null
          approved_by: string | null
          demolition_content: string | null
          generated_at: string | null
          generated_by: string | null
          generation_type: string | null
          id: string | null
          inspection_id: string | null
          model_name: string | null
          model_version: string | null
          problem_analysis_content: string | null
          prompt_tokens: number | null
          regeneration_feedback: string | null
          response_tokens: number | null
          superseded_at: string | null
          superseded_by_version_id: string | null
          system_prompt_hash: string | null
          user_prompt: string | null
          version_number: number | null
          what_we_found_text: string | null
          what_we_will_do_text: string | null
          what_you_get_text: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_summary_versions_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_summary_versions_superseded_by_version_id_fkey"
            columns: ["superseded_by_version_id"]
            isOneToOne: false
            referencedRelation: "ai_summary_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_summary_versions_superseded_by_version_id_fkey"
            columns: ["superseded_by_version_id"]
            isOneToOne: false
            referencedRelation: "latest_ai_summary"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      audited_insert_lead_via_framer: {
        Args: { p_acting_user_id: string; p_payload: Json }
        Returns: string
      }
      audited_mark_invoice_overdue: {
        Args: { p_acting_user_id: string; p_invoice_id: string }
        Returns: undefined
      }
      calculate_dew_point: {
        Args: { humidity: number; temperature: number }
        Returns: number
      }
      calculate_gst: { Args: { amount_ex_gst: number }; Returns: number }
      calculate_total_inc_gst: {
        Args: { amount_ex_gst: number }
        Returns: number
      }
      generate_inspection_number: { Args: never; Returns: string }
      generate_lead_number: { Args: never; Returns: string }
      get_user_roles_by_id: { Args: { p_user_id: string }; Returns: string[] }
      has_role: {
        Args: { _role_name: string; _user_id: string }
        Returns: boolean
      }
      is_admin:
        | { Args: never; Returns: boolean }
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
      lead_status:
        | "hipages_lead"
        | "new_lead"
        | "contacted"
        | "inspection_waiting"
        | "inspection_ai_summary"
        | "approve_inspection_report"
        | "inspection_email_approval"
        | "inspection_completed"
        | "inspection_report_pdf_completed"
        | "job_waiting"
        | "job_scheduled"
        | "job_completed"
        | "pending_review"
        | "job_report_pdf_sent"
        | "invoicing_sent"
        | "paid"
        | "google_review"
        | "finished"
        | "closed"
        | "not_landed"
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
      lead_status: [
        "hipages_lead",
        "new_lead",
        "contacted",
        "inspection_waiting",
        "inspection_ai_summary",
        "approve_inspection_report",
        "inspection_email_approval",
        "inspection_completed",
        "inspection_report_pdf_completed",
        "job_waiting",
        "job_scheduled",
        "job_completed",
        "pending_review",
        "job_report_pdf_sent",
        "invoicing_sent",
        "paid",
        "google_review",
        "finished",
        "closed",
        "not_landed",
      ],
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
