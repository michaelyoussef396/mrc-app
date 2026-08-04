import { createElement, useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { WifiOff } from 'lucide-react'
import { toast } from 'sonner'

import { supabase } from '@/integrations/supabase/client'
import {
  createJobCompletion,
  updateJobCompletion,
  submitJobCompletion,
  getJobCompletionByLeadId,
} from '@/lib/api/jobCompletions'
import { DEFAULT_JOB_COMPLETION_FORM } from '@/types/jobCompletion'
import type { JobCompletionFormData, JobCompletionRow } from '@/types/jobCompletion'

// 30 seconds in milliseconds — matches the inspection form auto-save interval
const AUTO_SAVE_INTERVAL_MS = 30_000

// localStorage backups older than this are ignored on restore
const BACKUP_MAX_AGE_MINUTES = 1440 // 24 hours

/**
 * Save-time offline classifier for user messaging. navigator.onLine can be
 * stale on iOS Safari after airplane-mode toggles, so also sniff the
 * fetch-level failure text: Chromium throws 'Failed to fetch', WebKit
 * 'Load failed', Firefox 'NetworkError'. Deliberately duplicated in
 * TechnicianInspectionForm.tsx — two call sites don't justify a shared module.
 * Exported for unit tests only.
 */
export function isNetworkLevelError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const message =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : String(err ?? '')
  return /failed to fetch|load failed|network ?error|fetch failed/i.test(message)
}

// Shared id so repeated offline warnings replace each other instead of stacking.
const OFFLINE_TOAST_ID = 'jc-offline-save'

// Amber warning look, dark text for WCAG contrast. Inline styles because the
// global sonner Toaster classNames (bg-background etc.) would fight per-toast
// Tailwind classes with unpredictable CSS-order results.
const OFFLINE_TOAST_STYLE: React.CSSProperties = {
  background: '#f59e0b', // amber-500
  color: '#451a03', // amber-950
  border: '1px solid #d97706', // amber-600
}

const OFFLINE_TOAST_DURATION_MS = 8_000

function showOfflineToast(title: string, description: string): void {
  toast.warning(title, {
    description,
    id: OFFLINE_TOAST_ID,
    duration: OFFLINE_TOAST_DURATION_MS,
    style: OFFLINE_TOAST_STYLE,
    // !important beats the global Toaster's muted description colour.
    descriptionClassName: '!text-amber-950',
    icon: createElement(WifiOff, { size: 20 }),
  })
}

/**
 * Map a database row (snake_case) to form state (camelCase).
 * Only maps the form-editable fields. Metadata fields (id, created_at, etc.)
 * are intentionally excluded — the DB record id is tracked separately.
 */
export function rowToFormData(row: JobCompletionRow): JobCompletionFormData {
  return {
    // Section 1: Office Info
    jobNumber: row.job_number ?? '',
    addressSnapshot: row.address_snapshot ?? '',
    requestedBy: row.requested_by ?? '',
    attentionTo: row.attention_to ?? '',

    // Section 2: Summary
    swmsCompleted: row.swms_completed,
    premisesType: (row.premises_type as JobCompletionFormData['premisesType']) ?? '',
    remediationCompletedBy: row.remediation_completed_by ?? '',
    completionDate: row.completion_date,
    areasTreated: row.areas_treated ?? [],

    // Section 3/4: Photos
    demolitionWorks: row.demolition_works,
    demolitionJustification: row.demolition_justification ?? '',
    demolitionRemovalNotes: row.demolition_removal_notes ?? '',

    // Section 5: Treatment Methods
    methodHepaVacuuming: row.method_hepa_vacuuming,
    methodSurfaceMouldRemediation: row.method_surface_mould_remediation,
    methodUlvFoggingProperty: row.method_ulv_fogging_property,
    methodUlvFoggingSubfloor: row.method_ulv_fogging_subfloor,
    methodSubfloorRemediation: row.method_subfloor_remediation,
    methodHepaAirScrubberInstallation: row.method_afd_installation,
    methodDryingEquipment: row.method_drying_equipment,
    methodContainmentPrv: row.method_containment_prv,
    methodMaterialDemolition: row.method_material_demolition,
    methodCavityTreatment: row.method_cavity_treatment,
    methodDebrisRemoval: row.method_debris_removal,

    // Section 6: Chemical Toggles
    chemicalAirFiltration: row.chemical_air_filtration,
    chemicalWaterBased: row.chemical_water_based,
    chemicalSodiumHypochlorite: row.chemical_sodium_hypochlorite,
    chemicalHepaVacuumed: row.chemical_hepa_vacuumed,
    chemicalSanitisedPremises: row.chemical_sanitised_premises,

    // Section 7: Equipment (actual)
    actualDehumidifierQty: row.actual_dehumidifier_qty,
    actualDehumidifierDays: row.actual_dehumidifier_days,
    actualAirMoverQty: row.actual_air_mover_qty,
    actualAirMoverDays: row.actual_air_mover_days,
    actualHepaAirScrubberQty: row.actual_afd_qty,
    actualHepaAirScrubberDays: row.actual_afd_days,
    actualRcdQty: row.actual_rcd_qty,
    actualRcdDays: row.actual_rcd_days,

    // Section 7: Equipment (quoted snapshot — read-only in UI)
    // NULL = never quoted (legacy row) — must survive the round-trip, never coerce to 0.
    quotedDehumidifierQty: row.quoted_dehumidifier_qty,
    quotedAirMoverQty: row.quoted_air_mover_qty,
    quotedRcdQty: row.quoted_rcd_qty,
    quotedEquipmentDays: row.quoted_equipment_days,
    quotedHepaAirScrubberQty: row.quoted_afd_qty,
    quotedHepaAirScrubberDays: row.quoted_afd_days,

    // Section 7: Waste disposal (quoted snapshot + actual confirm/override)
    quotedWasteM3: row.quoted_waste_disposal_m3,
    quotedWasteCost: row.quoted_waste_disposal_cost,
    actualWasteM3: row.actual_waste_disposal_m3,
    actualWasteCost: row.actual_waste_disposal_cost,
    actualWasteIsOverridden: row.actual_waste_disposal_is_overridden ?? false,

    // Section 8: Variation Tracking
    scopeChanged: row.scope_changed,
    scopeWhatChanged: row.scope_what_changed ?? '',
    scopeWhyChanged: row.scope_why_changed ?? '',
    scopeExtraWork: row.scope_extra_work ?? '',
    scopeReduced: row.scope_reduced ?? '',

    // Section 9: Job Notes
    requestReview: row.request_review,
    damagesPresent: row.damages_present,
    damagesDetails: row.damages_details ?? '',
    stainingPresent: row.staining_present,
    stainingDetails: row.staining_details ?? '',
    additionalNotes: row.additional_notes ?? '',

    // Section 10: Office Notes
    officeNotes: row.office_notes ?? '',
    followupRequired: row.followup_required,
  }
}

export interface UseJobCompletionFormReturn {
  formData: JobCompletionFormData
  setFormData: React.Dispatch<React.SetStateAction<JobCompletionFormData>>
  jobCompletionId: string | null
  submittedAt: string | null
  /**
   * Current status of the job_completions row. Needed so the form can derive
   * `isRevision = !!submittedAt && jobCompletionStatus === 'draft'` rather than
   * relying on `submittedAt` alone, which sticks around after a successful
   * resubmit and would leave the amber "Admin requested changes" banner up.
   */
  jobCompletionStatus: string | null
  isLoading: boolean
  isSaving: boolean
  hasUnsavedChanges: boolean
  currentSection: number
  setCurrentSection: React.Dispatch<React.SetStateAction<number>>
  handleChange: (field: keyof JobCompletionFormData, value: JobCompletionFormData[keyof JobCompletionFormData]) => void
  handleSave: () => Promise<void>
  handleSubmit: () => Promise<void>
  error: string | null
}

/**
 * Manages the full lifecycle of the job completion form.
 *
 * On mount, loads an existing draft from the DB (or creates one if none exists).
 * Tracks dirty state and auto-saves every 30 seconds. Keeps a localStorage
 * backup as crash recovery and offers restore on next mount.
 *
 * @param leadId - The lead this job completion belongs to.
 * @returns Form state and handlers consumed by TechnicianJobCompletionForm.
 */
export function useJobCompletionForm(leadId: string): UseJobCompletionFormReturn {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<JobCompletionFormData>(DEFAULT_JOB_COMPLETION_FORM)
  const [jobCompletionId, setJobCompletionId] = useState<string | null>(null)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [jobCompletionStatus, setJobCompletionStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [currentSection, setCurrentSection] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // Refs prevent stale closure captures inside the auto-save interval callback.
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges)
  hasUnsavedChangesRef.current = hasUnsavedChanges

  const isSavingRef = useRef(isSaving)
  isSavingRef.current = isSaving

  // Keep a stable ref to handleSave so the interval never captures a stale version.
  // The ref itself is updated after handleSave is defined below.
  const handleSaveRef = useRef<() => Promise<void>>(async () => {})

  // --- MOUNT: load or create ---

  useEffect(() => {
    let cancelled = false

    async function init() {
      setIsLoading(true)
      setError(null)

      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setError('Not authenticated. Please log in again.')
          return
        }

        // Check whether a draft already exists for this lead.
        const existing = await getJobCompletionByLeadId(leadId)

        if (cancelled) return

        if (existing) {
          setJobCompletionId(existing.id)
          setSubmittedAt(existing.submitted_at)
          setJobCompletionStatus(existing.status)
          setFormData(rowToFormData(existing))
          return
        }

        // No draft yet — look up the linked inspection so we can snapshot
        // quoted equipment and pre-populate areas treated.
        const { data: inspection } = await supabase
          .from('inspections')
          .select('id')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (cancelled) return

        const inspectionId = inspection?.id ?? null
        const row = await createJobCompletion(leadId, inspectionId, user.id)

        if (cancelled) return

        // Pre-populate "Remediation Completed By" with the logged-in user's
        // name — they can override it in the form if someone else did the work.
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle()
        const defaultCompletedByName =
          profile?.full_name ||
          (user.user_metadata as { full_name?: string } | null)?.full_name ||
          user.email ||
          ''

        setJobCompletionId(row.id)
        setJobCompletionStatus(row.status)
        setFormData({
          ...rowToFormData(row),
          remediationCompletedBy: defaultCompletedByName,
        })

        // Log activity: job completion started
        supabase.from('activities').insert({
          lead_id: leadId,
          activity_type: 'job_completion_started',
          title: 'Job Completion Started',
          description: `Job completion form created (${row.job_number})`,
          user_id: user.id,
        }).then() // fire-and-forget
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load job completion.'
          setError(message)
          toast.error('Could not load job form', { description: message })
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    init()

    return () => { cancelled = true }
  }, [leadId])

  // --- FIELD CHANGE ---

  const handleChange = useCallback(
    (field: keyof JobCompletionFormData, value: JobCompletionFormData[keyof JobCompletionFormData]) => {
      setFormData(prev => ({ ...prev, [field]: value }))
      setHasUnsavedChanges(true)
    },
    []
  )

  // --- SAVE ---

  const handleSave = useCallback(async () => {
    if (!jobCompletionId) return

    setIsSaving(true)
    try {
      await updateJobCompletion(jobCompletionId, formData)
      setHasUnsavedChanges(false)
      toast.success('Saved to the server')
    } catch (err) {
      if (isNetworkLevelError(err)) {
        showOfflineToast(
          "You're offline — not saved to the server",
          "Your changes are only on this device for now. Keep this form open — it will save to the server automatically once you're back online.",
        )
      } else {
        const message = err instanceof Error ? err.message : 'Save failed.'
        toast.error('Could not save', { description: message })
      }
      // Re-throw so callers (handleSubmit) can detect failure and abort.
      // Autosave callers must catch this themselves — see the interval effect below.
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [jobCompletionId, formData])

  // Keep the ref in sync so the auto-save interval always calls the latest version.
  handleSaveRef.current = handleSave

  // --- AUTO-SAVE (30-second interval) ---

  useEffect(() => {
    const interval = setInterval(() => {
      if (hasUnsavedChangesRef.current && !isSavingRef.current) {
        // Autosave failures are non-fatal: silence the rejection so it never
        // becomes an unhandled promise error. The user sees the "Could not save"
        // toast from handleSave; no extra noise needed on the interval path.
        handleSaveRef.current().catch(() => {})
      }
    }, AUTO_SAVE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])

  // --- LOCALSTORAGE BACKUP ---

  // The key is stable once jobCompletionId is set. Defined as a variable (not
  // state) so it doesn't cause extra renders.
  const localStorageKey = jobCompletionId
    ? `mrc_job_completion_backup_${jobCompletionId}`
    : null

  // Write a backup 30 seconds after any change (debounce pattern).
  useEffect(() => {
    if (!localStorageKey || !hasUnsavedChanges) return

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          localStorageKey,
          JSON.stringify({ formData, currentSection, savedAt: new Date().toISOString() })
        )
      } catch {
        // localStorage full or unavailable — not a critical failure, ignore silently.
      }
    }, AUTO_SAVE_INTERVAL_MS)

    return () => clearTimeout(timer)
  }, [formData, currentSection, localStorageKey, hasUnsavedChanges])

  // On mount (once localStorageKey becomes available): offer to restore a recent backup.
  useEffect(() => {
    if (!localStorageKey) return

    try {
      const raw = localStorage.getItem(localStorageKey)
      if (!raw) return

      const parsed: { formData: JobCompletionFormData; currentSection: number; savedAt: string } = JSON.parse(raw)
      const savedAt = new Date(parsed.savedAt)
      const ageMinutes = (Date.now() - savedAt.getTime()) / 60_000

      if (ageMinutes < BACKUP_MAX_AGE_MINUTES && parsed.formData) {
        const timeLabel = savedAt.toLocaleTimeString('en-AU', { timeZone: 'Australia/Melbourne' }).replace(/\b[ap]m\b/gi, (m) => m.toUpperCase())

        toast('Unsaved work found', {
          description: `Backup from ${timeLabel}. Tap to restore.`,
          duration: 10_000,
          action: {
            label: 'Restore',
            onClick: () => {
              setFormData(parsed.formData)
              if (parsed.currentSection) setCurrentSection(parsed.currentSection)
              setHasUnsavedChanges(true)
              toast.success('Restored', { description: 'Your previous work has been restored.' })
            },
          },
        })
      }
    } catch {
      // Corrupt backup — ignore.
    }
  }, [localStorageKey])

  // Remove the localStorage backup once the form is successfully saved (clean state).
  useEffect(() => {
    if (!hasUnsavedChanges && localStorageKey) {
      try { localStorage.removeItem(localStorageKey) } catch {}
    }
  }, [hasUnsavedChanges, localStorageKey])

  // --- SUBMIT ---

  const handleSubmit = useCallback(async () => {
    if (!jobCompletionId) return

    // Flush any pending changes before marking as submitted.
    // If the save fails, abort entirely — generating a PDF from stale DB data
    // violates the zero-data-loss guarantee and would show a false success.
    try {
      await handleSave()
    } catch (err) {
      if (isNetworkLevelError(err)) {
        // Replaces handleSave's offline toast (same id) with submit wording.
        showOfflineToast(
          "You're offline — job not submitted",
          "Nothing was sent to the server. Your answers are kept on this device — keep this form open and submit again once you're back online.",
        )
      } else {
        toast.error("Couldn't submit", {
          description: "Your latest changes didn't save. Please retry.",
        })
      }
      return
    }

    try {
      await submitJobCompletion(jobCompletionId)

      // Flip local jc status + submitted_at so isRevision derivation in the form
      // becomes false immediately — the amber "Admin requested changes" banner
      // shouldn't re-render after a successful resubmit.
      setJobCompletionStatus('submitted')
      setSubmittedAt(new Date().toISOString())

      // Invalidate LeadDetail's cached lead row + the activity timeline so the
      // post-submit navigation lands on fresh data instead of the pre-resubmit
      // status. Dashboard hooks (useTechnicianJobs / useRevisionJobs) are raw
      // useState + useEffect and re-fetch on mount, so no extra invalidation
      // is needed for those surfaces.
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['activity-timeline'] })

      // Log activity: job completion submitted
      supabase.from('activities').insert({
        lead_id: leadId,
        activity_type: 'job_completion_submitted',
        title: 'Job Completion Submitted',
        description: formData.requestReview
          ? 'Job submitted — flagged for admin review'
          : 'Job completion submitted successfully',
      }).then() // fire-and-forget

      // Fire-and-forget: generate PDF when going directly to job_completed (Path B)
      if (!formData.requestReview && jobCompletionId) {
        import('@/lib/api/jobReportPdf').then(({ generateJobReportPdf }) => {
          generateJobReportPdf(jobCompletionId).catch(err =>
            console.error('[auto-pdf] Job report generation failed (non-fatal):', err)
          );
        });
      }

      toast.success('Job submitted', {
        description: formData.requestReview
          ? 'Flagged for admin review.'
          : 'Job marked as completed.',
      })
    } catch (err) {
      if (isNetworkLevelError(err)) {
        showOfflineToast(
          "You're offline — job not submitted",
          "Nothing was sent to the server. Your answers are kept on this device — keep this form open and submit again once you're back online.",
        )
      } else {
        const message = err instanceof Error ? err.message : 'Submit failed.'
        toast.error('Could not submit job', { description: message })
      }
      // Re-throw so the form page can decide whether to navigate.
      throw err
    }
  }, [jobCompletionId, leadId, formData.requestReview, handleSave, queryClient])

  return {
    formData,
    setFormData,
    jobCompletionId,
    submittedAt,
    jobCompletionStatus,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    currentSection,
    setCurrentSection,
    handleChange,
    handleSave,
    handleSubmit,
    error,
  }
}
