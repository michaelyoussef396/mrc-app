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
      inspections: {
        Row: {
          id: string
          lead_id: string
          inspection_date: string
          inspector_id: string
          // Job Type Hours
          no_demolition_hours: number | null
          demolition_hours: number | null
          construction_hours: number | null
          subfloor_hours: number | null
          // Equipment Quantities
          dehumidifier_count: number | null
          air_mover_count: number | null
          rcd_count: number | null
          equipment_days: number | null
          // Manual Override
          manual_price_override: boolean | null
          manual_total_inc_gst: number | null
          // Calculated Pricing
          labor_cost_ex_gst: number | null
          discount_percent: number | null
          subtotal_ex_gst: number | null
          gst_amount: number | null
          total_inc_gst: number | null
          // ... other existing fields
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          // Same structure as Row but with optional fields
        }
        Update: {
          // Same structure as Row but all fields optional
        }
      }
      // ... other tables
    }
  }
}
