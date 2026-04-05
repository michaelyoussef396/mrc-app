import { useState, useEffect, useRef, useCallback } from 'react'
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
 * Map a database row (snake_case) to form state (camelCase).
 * Only maps the form-editable fields. Metadata fields (id, created_at, etc.)
 * are intentionally excluded — the DB record id is tracked separately.
 */
function rowToFormData(row: JobCompletionRow): JobCompletionFormData {
  return {
    // Section 1: Office Info
    jobNumber: row.job_number ?? '',
    addressSnapshot: row.address_snapshot ?? '',
    requestedBy: row.requested_by ?? '',
    attentionTo: row.attention_to ?? '',

    // Section 2: Summary
    swmsCompleted: row.swms_completed,
    premisesType: (row.premises_type as JobCompletionFormData['premisesType']) ?? '',
    completionDate: row.completion_date,
    areasTreated: row.areas_treated ?? [],

    // Section 3/4: Photos
    demolitionWorks: row.demolition_works,

    // Section 5: Treatment Methods
    methodHepaVacuuming: row.method_hepa_vacuuming,
    methodSurfaceMouldRemediation: row.method_surface_mould_remediation,
    methodUlvFoggingProperty: row.method_ulv_fogging_property,
    methodUlvFoggingSubfloor: row.method_ulv_fogging_subfloor,
    methodSubfloorRemediation: row.method_subfloor_remediation,
    methodAfdInstallation: row.method_afd_installation,
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
    actualAfdQty: row.actual_afd_qty,
    actualAfdDays: row.actual_afd_days,
    actualRcdQty: row.actual_rcd_qty,
    actualRcdDays: row.actual_rcd_days,

    // Section 7: Equipment (quoted snapshot — read-only in UI)
    quotedDehumidifierQty: row.quoted_dehumidifier_qty,
    quotedAirMoverQty: row.quoted_air_mover_qty,
    quotedRcdQty: row.quoted_rcd_qty,
    quotedEquipmentDays: row.quoted_equipment_days,

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
  const [formData, setFormData] = useState<JobCompletionFormData>(DEFAULT_JOB_COMPLETION_FORM)
  const [jobCompletionId, setJobCompletionId] = useState<string | null>(null)
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

        setJobCompletionId(row.id)
        setFormData(rowToFormData(row))

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
      toast.success('Saved')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed.'
      toast.error('Could not save', { description: message })
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
        handleSaveRef.current()
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
        const timeLabel = savedAt.toLocaleTimeString('en-AU', { timeZone: 'Australia/Melbourne' })

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
    await handleSave()

    try {
      await submitJobCompletion(jobCompletionId)

      // Log activity: job completion submitted
      supabase.from('activities').insert({
        lead_id: leadId,
        activity_type: 'job_completion_submitted',
        title: 'Job Completion Submitted',
        description: formData.requestReview
          ? 'Job submitted — flagged for admin review'
          : 'Job completion submitted successfully',
      }).then() // fire-and-forget

      toast.success('Job submitted', {
        description: formData.requestReview
          ? 'Flagged for admin review.'
          : 'Job marked as completed.',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submit failed.'
      toast.error('Could not submit job', { description: message })
      // Re-throw so the form page can decide whether to navigate.
      throw err
    }
  }, [jobCompletionId, leadId, formData.requestReview, handleSave])

  return {
    formData,
    setFormData,
    jobCompletionId,
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
