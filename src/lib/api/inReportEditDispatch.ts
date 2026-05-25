// In-report edit dispatch (Phase B1).
//
// Replaces the dead `editable_fields` table lookup. The real authoritative
// field map for the in-report editor lives at ViewReportPDF.tsx:1365-1383
// (handleFieldClick → getFieldValue). This module mirrors that exact set of
// keys with code-resident metadata so writes route to the correct table /
// strategy without a DB lookup that points at renamed or dropped columns.
//
// Three write strategies:
//   - inspection_update           direct UPDATE on inspections (Class A)
//   - ai_summary_version_insert   new ai_summary_versions row via callback (Class B)
//   - read_only                   refused — pricing guardrail OR deferred-scope
//
// Per Phase B1 brief: ALL pricing/equipment fields are read_only by explicit
// product decision (editing them bypasses the 13% discount cap in pricing.ts).
// client_name + property_address are read_only in B1 (leads writes deferred
// to a future phase — `lead_update` strategy + compound-address editor).

import { supabase } from '@/integrations/supabase/client'

export type WriteStrategy =
  | 'inspection_update'
  | 'ai_summary_version_insert'
  | 'read_only'

// Columns inside ai_summary_versions that a single field_key may target via
// Class B. Keep this in sync with the persistManualEdit signature in
// ViewReportPDF.tsx:1414-1421.
export type AiSummaryVersionColumn =
  | 'ai_summary_text'
  | 'what_we_found_text'
  | 'what_we_will_do_text'
  | 'problem_analysis_content'
  | 'demolition_content'

export interface EditFieldDescriptor {
  key: string
  label: string
  type: 'text' | 'number' | 'textarea' | 'date' | 'currency'
  table: 'inspections' | 'ai_summary_versions' | null
  column: string | null
  writeStrategy: WriteStrategy
  versionColumn?: AiSummaryVersionColumn
}

// Authoritative B1 map. Keys mirror ViewReportPDF.tsx:1365-1383 getFieldValue
// EXACTLY — every modal-surfaced field has an entry here, every read_only
// field is refused at dispatch time AND blocked at click time in the page.
export const IN_REPORT_FIELD_MAP: Record<string, EditFieldDescriptor> = {
  // Class A — direct UPDATE on inspections
  cause_of_mould: {
    key: 'cause_of_mould',
    label: 'Cause of Mould',
    type: 'textarea',
    table: 'inspections',
    column: 'cause_of_mould',
    writeStrategy: 'inspection_update',
  },
  outdoor_temperature: {
    key: 'outdoor_temperature',
    label: 'Outdoor Temperature',
    type: 'number',
    table: 'inspections',
    column: 'outdoor_temperature',
    writeStrategy: 'inspection_update',
  },
  outdoor_humidity: {
    key: 'outdoor_humidity',
    label: 'Outdoor Humidity',
    type: 'number',
    table: 'inspections',
    column: 'outdoor_humidity',
    writeStrategy: 'inspection_update',
  },
  outdoor_dew_point: {
    key: 'outdoor_dew_point',
    label: 'Outdoor Dew Point',
    type: 'number',
    table: 'inspections',
    column: 'outdoor_dew_point',
    writeStrategy: 'inspection_update',
  },
  outdoor_comments: {
    key: 'outdoor_comments',
    label: 'Outdoor Comments',
    type: 'textarea',
    table: 'inspections',
    column: 'outdoor_comments',
    writeStrategy: 'inspection_update',
  },

  // Class B — version-on-write into ai_summary_versions
  ai_summary: {
    key: 'ai_summary',
    label: 'AI Summary',
    type: 'textarea',
    table: 'ai_summary_versions',
    column: 'ai_summary_text',
    writeStrategy: 'ai_summary_version_insert',
    versionColumn: 'ai_summary_text',
  },

  // Read-only — pricing guardrail. Editing any of these from the report
  // would bypass the 13% discount cap in src/lib/calculations/pricing.ts.
  labor_cost: {
    key: 'labor_cost',
    label: 'Labour Cost',
    type: 'currency',
    table: null,
    column: null,
    writeStrategy: 'read_only',
  },
  equipment_cost: {
    key: 'equipment_cost',
    label: 'Equipment Cost',
    type: 'currency',
    table: null,
    column: null,
    writeStrategy: 'read_only',
  },
  subtotal_ex_gst: {
    key: 'subtotal_ex_gst',
    label: 'Subtotal ex GST',
    type: 'currency',
    table: null,
    column: null,
    writeStrategy: 'read_only',
  },
  gst_amount: {
    key: 'gst_amount',
    label: 'GST',
    type: 'currency',
    table: null,
    column: null,
    writeStrategy: 'read_only',
  },
  total_inc_gst: {
    key: 'total_inc_gst',
    label: 'Total Cost (inc GST)',
    type: 'currency',
    table: null,
    column: null,
    writeStrategy: 'read_only',
  },

  // Read-only in B1 — leads-table writes deferred. The Page 1 inline editor
  // (Page1Field via handlePage1FieldSave in ViewReportPDF.tsx:2065) is the
  // canonical surface for these today and persists correctly there.
  client_name: {
    key: 'client_name',
    label: 'Client Name',
    type: 'text',
    table: null,
    column: null,
    writeStrategy: 'read_only',
  },
  property_address: {
    key: 'property_address',
    label: 'Property Address',
    type: 'textarea',
    table: null,
    column: null,
    writeStrategy: 'read_only',
  },
}

export interface DispatchOpts {
  // Injected from ViewReportPDF — needed because Class B writes route through
  // the existing race-safe persistManualEdit (ViewReportPDF.tsx:1411-1480)
  // which is component-scoped (updates local state after the DB write).
  persistManualEdit: (updates: Partial<Record<AiSummaryVersionColumn, string | null>>) => Promise<void>
}

export interface DispatchResult {
  success: boolean
  error?: string
}

export async function dispatchInReportEdit(
  inspectionId: string,
  fieldKey: string,
  newValue: string | number,
  opts: DispatchOpts,
): Promise<DispatchResult> {
  const descriptor = IN_REPORT_FIELD_MAP[fieldKey]

  if (!descriptor) {
    return { success: false, error: `Unknown field: ${fieldKey}` }
  }

  if (descriptor.writeStrategy === 'read_only') {
    return {
      success: false,
      error: `${descriptor.label} is read-only here — edit via the inspection form.`,
    }
  }

  if (descriptor.writeStrategy === 'inspection_update') {
    if (!descriptor.column) {
      return { success: false, error: `Misconfigured field: ${fieldKey} has no column` }
    }
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) return { success: false, error: `Session error: ${sessionError.message}` }
    if (!session) return { success: false, error: 'Not authenticated' }

    const { error } = await supabase
      .from('inspections')
      .update({
        [descriptor.column]: newValue,
        last_edited_at: new Date().toISOString(),
        last_edited_by: session.user.id,
      })
      .eq('id', inspectionId)

    if (error) return { success: false, error: `Save failed: ${error.message}` }
    return { success: true }
  }

  if (descriptor.writeStrategy === 'ai_summary_version_insert') {
    if (!descriptor.versionColumn) {
      return { success: false, error: `Misconfigured field: ${fieldKey} has no versionColumn` }
    }
    try {
      await opts.persistManualEdit({ [descriptor.versionColumn]: String(newValue) })
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Manual edit failed',
      }
    }
  }

  // Exhaustiveness guard
  return { success: false, error: 'Unsupported write strategy' }
}
