import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// ============================================================================
// TYPES
// ============================================================================

// The original cost breakdown the customer was quoted on the inspection.
// Sourced from job_completions.inspection_id when a completion exists,
// otherwise the latest inspection on the lead.
export interface OriginalQuote {
  inspectionId: string
  option1TotalIncGst: number | null
  option2TotalIncGst: number | null
  totalIncGst: number | null
  labourCostExGst: number | null
  equipmentCostExGst: number | null
  discountPercent: number | null
  dehumidifierQty: number
  airMoverQty: number
  rcdQty: number
  equipmentDays: number | null
  createdAt: string
}

// What the job completion form currently captures about variations.
export interface CurrentVariation {
  jobCompletionId: string
  scopeChanged: boolean
  scopeWhatChanged: string | null
  scopeWhyChanged: string | null
  scopeExtraWork: string | null
  scopeReduced: string | null
  actualDehumidifierQty: number
  actualDehumidifierDays: number
  actualAirMoverQty: number
  actualAirMoverDays: number
  actualAfdQty: number
  actualAfdDays: number
  actualRcdQty: number
  actualRcdDays: number
  updatedAt: string
}

type ScopeField =
  | 'scope_changed'
  | 'scope_what_changed'
  | 'scope_why_changed'
  | 'scope_extra_work'
  | 'scope_reduced'

// One field-level scope diff extracted from an audit_log UPDATE row.
export interface ChangeTimelineEvent {
  auditLogId: string
  field: ScopeField
  before: unknown
  after: unknown
  changedAt: string
  changedBy: string | null
  changedByUserId: string | null
}

export interface VariationContext {
  originalQuote: OriginalQuote | null
  currentVariation: CurrentVariation | null
  changeTimeline: ChangeTimelineEvent[]
  isLoading: boolean
  error: Error | null
}

// ============================================================================
// HELPERS (file-local)
// ============================================================================

const SCOPE_FIELDS: readonly ScopeField[] = [
  'scope_changed',
  'scope_what_changed',
  'scope_why_changed',
  'scope_extra_work',
  'scope_reduced',
] as const

interface AuditMetadata {
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}

function parseAuditMetadata(raw: unknown): AuditMetadata {
  if (!raw || typeof raw !== 'object') return {}
  const meta = raw as Record<string, unknown>
  return {
    before: isPlainObject(meta.before) ? (meta.before as Record<string, unknown>) : null,
    after: isPlainObject(meta.after) ? (meta.after as Record<string, unknown>) : null,
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

interface RawAuditRow {
  id: string
  metadata: unknown
  created_at: string | null
  user_id: string | null
}

function extractScopeDeltas(row: RawAuditRow): Array<Omit<ChangeTimelineEvent, 'changedBy'>> {
  const { before, after } = parseAuditMetadata(row.metadata)
  if (!before || !after) return []

  const deltas: Array<Omit<ChangeTimelineEvent, 'changedBy'>> = []
  for (const field of SCOPE_FIELDS) {
    if (!(field in before) && !(field in after)) continue
    const oldValue = before[field] ?? null
    const newValue = after[field] ?? null
    if (oldValue !== newValue) {
      deltas.push({
        auditLogId: row.id,
        field,
        before: oldValue,
        after: newValue,
        changedAt: row.created_at ?? new Date(0).toISOString(),
        changedByUserId: row.user_id,
      })
    }
  }
  return deltas
}

interface RawInspectionRow {
  id: string
  option_1_total_inc_gst: number | null
  option_2_total_inc_gst: number | null
  total_inc_gst: number | null
  labour_cost_ex_gst: number | null
  equipment_cost_ex_gst: number | null
  discount_percent: number | null
  commercial_dehumidifier_qty: number | null
  air_movers_qty: number | null
  rcd_box_qty: number | null
  equipment_days: number | null
  created_at: string
}

function toOriginalQuote(row: RawInspectionRow): OriginalQuote {
  return {
    inspectionId: row.id,
    option1TotalIncGst: row.option_1_total_inc_gst,
    option2TotalIncGst: row.option_2_total_inc_gst,
    totalIncGst: row.total_inc_gst,
    labourCostExGst: row.labour_cost_ex_gst,
    equipmentCostExGst: row.equipment_cost_ex_gst,
    discountPercent: row.discount_percent,
    dehumidifierQty: row.commercial_dehumidifier_qty ?? 0,
    airMoverQty: row.air_movers_qty ?? 0,
    rcdQty: row.rcd_box_qty ?? 0,
    equipmentDays: row.equipment_days,
    createdAt: row.created_at,
  }
}

interface RawJobCompletionRow {
  id: string
  inspection_id: string | null
  scope_changed: boolean
  scope_what_changed: string | null
  scope_why_changed: string | null
  scope_extra_work: string | null
  scope_reduced: string | null
  actual_dehumidifier_qty: number | null
  actual_dehumidifier_days: number | null
  actual_air_mover_qty: number | null
  actual_air_mover_days: number | null
  actual_afd_qty: number | null
  actual_afd_days: number | null
  actual_rcd_qty: number | null
  actual_rcd_days: number | null
  updated_at: string | null
  created_at: string
}

function toCurrentVariation(row: RawJobCompletionRow): CurrentVariation {
  return {
    jobCompletionId: row.id,
    scopeChanged: row.scope_changed,
    scopeWhatChanged: row.scope_what_changed,
    scopeWhyChanged: row.scope_why_changed,
    scopeExtraWork: row.scope_extra_work,
    scopeReduced: row.scope_reduced,
    actualDehumidifierQty: row.actual_dehumidifier_qty ?? 0,
    actualDehumidifierDays: row.actual_dehumidifier_days ?? 0,
    actualAirMoverQty: row.actual_air_mover_qty ?? 0,
    actualAirMoverDays: row.actual_air_mover_days ?? 0,
    actualAfdQty: row.actual_afd_qty ?? 0,
    actualAfdDays: row.actual_afd_days ?? 0,
    actualRcdQty: row.actual_rcd_qty ?? 0,
    actualRcdDays: row.actual_rcd_days ?? 0,
    updatedAt: row.updated_at ?? row.created_at,
  }
}

const INSPECTION_COLUMNS =
  'id, option_1_total_inc_gst, option_2_total_inc_gst, total_inc_gst, labour_cost_ex_gst, equipment_cost_ex_gst, discount_percent, commercial_dehumidifier_qty, air_movers_qty, rcd_box_qty, equipment_days, created_at'

const JOB_COMPLETION_COLUMNS =
  'id, inspection_id, scope_changed, scope_what_changed, scope_why_changed, scope_extra_work, scope_reduced, actual_dehumidifier_qty, actual_dehumidifier_days, actual_air_mover_qty, actual_air_mover_days, actual_afd_qty, actual_afd_days, actual_rcd_qty, actual_rcd_days, updated_at, created_at'

// ============================================================================
// HOOK
// ============================================================================

export function useVariationContext(leadId: string | null): VariationContext {
  // Query 1: Job completion for this lead (drives inspection selection + audit query)
  const jobCompletionQuery = useQuery({
    queryKey: ['variation-context', 'job-completion', leadId],
    queryFn: async (): Promise<RawJobCompletionRow | null> => {
      if (!leadId) return null
      const { data, error } = await supabase
        .from('job_completions')
        .select(JOB_COMPLETION_COLUMNS)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data as RawJobCompletionRow | null) ?? null
    },
    enabled: !!leadId,
  })

  const jobCompletion = jobCompletionQuery.data ?? null
  const anchorInspectionId = jobCompletion?.inspection_id ?? null

  // Query 2: Original quote inspection
  // Prefers the inspection the job_completion anchors to; falls back to latest by created_at.
  const inspectionQuery = useQuery({
    queryKey: ['variation-context', 'inspection', leadId, anchorInspectionId],
    queryFn: async (): Promise<RawInspectionRow | null> => {
      if (!leadId) return null
      if (anchorInspectionId) {
        const { data, error } = await supabase
          .from('inspections')
          .select(INSPECTION_COLUMNS)
          .eq('id', anchorInspectionId)
          .maybeSingle()
        if (error) throw error
        return (data as RawInspectionRow | null) ?? null
      }
      const { data, error } = await supabase
        .from('inspections')
        .select(INSPECTION_COLUMNS)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data as RawInspectionRow | null) ?? null
    },
    enabled: !!leadId && !jobCompletionQuery.isLoading,
  })

  // Query 3: Audit log timeline for the job completion (with profile hydration in one go)
  const timelineQuery = useQuery({
    queryKey: ['variation-context', 'timeline', jobCompletion?.id],
    queryFn: async (): Promise<ChangeTimelineEvent[]> => {
      if (!jobCompletion?.id) return []

      const { data: rawRows, error: auditError } = await supabase
        .from('audit_logs')
        .select('id, metadata, created_at, user_id')
        .eq('entity_type', 'job_completions')
        .eq('entity_id', jobCompletion.id)
        .eq('action', 'UPDATE')
        .order('created_at', { ascending: false })
      if (auditError) throw auditError

      const rows = (rawRows as RawAuditRow[] | null) ?? []
      const allDeltas = rows.flatMap(extractScopeDeltas)
      if (allDeltas.length === 0) return []

      const userIds = [...new Set(
        allDeltas.map(d => d.changedByUserId).filter((id): id is string => !!id)
      )]

      const profileMap = new Map<string, string>()
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds)
        if (profileError) throw profileError
        for (const profile of profiles ?? []) {
          if (profile.full_name) profileMap.set(profile.id, profile.full_name)
        }
      }

      return allDeltas.map(delta => ({
        ...delta,
        changedBy: delta.changedByUserId ? profileMap.get(delta.changedByUserId) ?? null : null,
      }))
    },
    enabled: !!jobCompletion?.id,
  })

  const isLoading =
    jobCompletionQuery.isLoading || inspectionQuery.isLoading || timelineQuery.isLoading
  const error =
    (jobCompletionQuery.error as Error | null) ??
    (inspectionQuery.error as Error | null) ??
    (timelineQuery.error as Error | null) ??
    null

  return {
    originalQuote: inspectionQuery.data ? toOriginalQuote(inspectionQuery.data) : null,
    currentVariation: jobCompletion ? toCurrentVariation(jobCompletion) : null,
    changeTimeline: timelineQuery.data ?? [],
    isLoading,
    error,
  }
}
