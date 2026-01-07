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
      calendar_events: {
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
            foreignKeyName: "calendar_events_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
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
            referencedRelation: "inspections"
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
      inspections: {
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
          job_number: string | null
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
          inspection_date: string
          inspection_start_time?: string | null
          inspector_id: string
          job_number?: string | null
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
          job_number?: string | null
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
            referencedRelation: "inspections"
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
          lead_source_other: string | null
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
          lead_source_other?: string | null
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
          lead_source_other?: string | null
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
          message: string
          priority: string | null
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message: string
          priority?: string | null
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message?: string
          priority?: string | null
          read?: boolean | null
          title?: string
          type?: string
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
          order_index: number | null
          photo_type: string
          storage_path: string
          subfloor_id: string | null
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
          order_index?: number | null
          photo_type: string
          storage_path: string
          subfloor_id?: string | null
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
          order_index?: number | null
          photo_type?: string
          storage_path?: string
          subfloor_id?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_skipped: boolean | null
          onboarding_step: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_skipped?: boolean | null
          onboarding_step?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_skipped?: boolean | null
          onboarding_step?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          onboarding_completed: boolean | null
          onboarding_step: string | null
          password_hash: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          password_hash: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          password_hash?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
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
      generate_invoice_number: { Args: never; Returns: string }
      generate_lead_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "technician" | "manager"
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
      app_role: ["admin", "technician", "manager"],
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
