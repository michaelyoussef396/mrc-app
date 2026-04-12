// Type definitions for job completion form (Phase 2)

export type JobCompletionStatus = 'draft' | 'submitted' | 'approved';

export type PremisesType = 'residential' | 'commercial';

export type PhotoCategory = 'before' | 'after' | 'demolition';

// Equipment usage for Section 7 — one row per equipment type
export interface EquipmentUsageRow {
  name: string;
  actualQty: number;
  actualDays: number;
  dailyRate: number;        // from EQUIPMENT_RATES
  subtotal: number;         // qty × days × rate (calculated)
  quotedQty: number;        // snapshot from inspection
  quotedDays: number;       // snapshot from inspection
  isOverQuoted: boolean;    // actual exceeds quoted (calculated)
}

// Section 8 variation data
export interface VariationData {
  scopeChanged: boolean;
  whatChanged: string;
  whyChanged: string;
  extraWork: string;
  scopeReduced: string;
}

// Complete form data — camelCase to match React state, mapped to snake_case on save
export interface JobCompletionFormData {
  // Section 1: Office Info (read-only, pre-populated)
  jobNumber: string;
  addressSnapshot: string;
  requestedBy: string;
  attentionTo: string;

  // Section 2: Summary
  swmsCompleted: boolean;
  premisesType: PremisesType | '';
  remediationCompletedBy: string; // free-text name of who did the work
  completionDate: string;       // ISO date string (YYYY-MM-DD)
  areasTreated: string[];       // array of area names from inspection

  // Section 3 & 4: Photos (managed separately via photo upload hooks)
  demolitionWorks: boolean;
  demolitionJustification: string;
  demolitionRemovalNotes: string;

  // Section 5: Treatment Methods (11 toggles)
  methodHepaVacuuming: boolean;
  methodSurfaceMouldRemediation: boolean;
  methodUlvFoggingProperty: boolean;
  methodUlvFoggingSubfloor: boolean;
  methodSubfloorRemediation: boolean;
  methodAfdInstallation: boolean;
  methodDryingEquipment: boolean;
  methodContainmentPrv: boolean;
  methodMaterialDemolition: boolean;
  methodCavityTreatment: boolean;
  methodDebrisRemoval: boolean;

  // Section 6: Chemical Toggles (5 toggles)
  chemicalAirFiltration: boolean;
  chemicalWaterBased: boolean;
  chemicalSodiumHypochlorite: boolean;
  chemicalHepaVacuumed: boolean;
  chemicalSanitisedPremises: boolean;

  // Section 7: Equipment Used (actual)
  actualDehumidifierQty: number;
  actualDehumidifierDays: number;
  actualAirMoverQty: number;
  actualAirMoverDays: number;
  actualAfdQty: number;
  actualAfdDays: number;
  actualRcdQty: number;
  actualRcdDays: number;

  // Section 7: Quoted equipment (snapshot, read-only)
  quotedDehumidifierQty: number;
  quotedAirMoverQty: number;
  quotedRcdQty: number;
  quotedEquipmentDays: number;

  // Section 8: Variation Tracking
  scopeChanged: boolean;
  scopeWhatChanged: string;
  scopeWhyChanged: string;
  scopeExtraWork: string;
  scopeReduced: string;

  // Section 9: Job Notes (technician)
  requestReview: boolean;
  damagesPresent: boolean;
  damagesDetails: string;
  stainingPresent: boolean;
  stainingDetails: string;
  additionalNotes: string;

  // Section 10: Office Notes (admin only)
  officeNotes: string;
  followupRequired: boolean;
}

// Database row shape (snake_case, matches job_completions table)
export interface JobCompletionRow {
  id: string;
  lead_id: string;
  inspection_id: string | null;
  job_number: string | null;
  address_snapshot: string | null;
  requested_by: string | null;
  attention_to: string | null;
  swms_completed: boolean;
  premises_type: string | null;
  completed_by: string;
  remediation_completed_by: string | null;
  completion_date: string;
  areas_treated: string[];
  demolition_works: boolean;
  demolition_justification: string | null;
  demolition_removal_notes: string | null;
  method_hepa_vacuuming: boolean;
  method_surface_mould_remediation: boolean;
  method_ulv_fogging_property: boolean;
  method_ulv_fogging_subfloor: boolean;
  method_subfloor_remediation: boolean;
  method_afd_installation: boolean;
  method_drying_equipment: boolean;
  method_containment_prv: boolean;
  method_material_demolition: boolean;
  method_cavity_treatment: boolean;
  method_debris_removal: boolean;
  chemical_air_filtration: boolean;
  chemical_water_based: boolean;
  chemical_sodium_hypochlorite: boolean;
  chemical_hepa_vacuumed: boolean;
  chemical_sanitised_premises: boolean;
  actual_dehumidifier_qty: number;
  actual_dehumidifier_days: number;
  actual_air_mover_qty: number;
  actual_air_mover_days: number;
  actual_afd_qty: number;
  actual_afd_days: number;
  actual_rcd_qty: number;
  actual_rcd_days: number;
  quoted_dehumidifier_qty: number;
  quoted_air_mover_qty: number;
  quoted_rcd_qty: number;
  quoted_equipment_days: number;
  scope_changed: boolean;
  scope_what_changed: string | null;
  scope_why_changed: string | null;
  scope_extra_work: string | null;
  scope_reduced: string | null;
  request_review: boolean;
  damages_present: boolean;
  damages_details: string | null;
  staining_present: boolean;
  staining_details: string | null;
  additional_notes: string | null;
  office_notes: string | null;
  followup_required: boolean;
  pdf_url: string | null;
  pdf_version: number;
  pdf_generated_at: string | null;
  pdf_approved: boolean;
  pdf_approved_at: string | null;
  pdf_approved_by: string | null;
  status: JobCompletionStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

// Default form data for initializing a new job completion
export const DEFAULT_JOB_COMPLETION_FORM: JobCompletionFormData = {
  jobNumber: '',
  addressSnapshot: '',
  requestedBy: '',
  attentionTo: '',
  swmsCompleted: false,
  premisesType: '',
  remediationCompletedBy: '',
  completionDate: new Date().toISOString().split('T')[0],
  areasTreated: [],
  demolitionWorks: false,
  demolitionJustification: '',
  demolitionRemovalNotes: '',
  methodHepaVacuuming: false,
  methodSurfaceMouldRemediation: false,
  methodUlvFoggingProperty: false,
  methodUlvFoggingSubfloor: false,
  methodSubfloorRemediation: false,
  methodAfdInstallation: false,
  methodDryingEquipment: false,
  methodContainmentPrv: false,
  methodMaterialDemolition: false,
  methodCavityTreatment: false,
  methodDebrisRemoval: false,
  chemicalAirFiltration: false,
  chemicalWaterBased: false,
  chemicalSodiumHypochlorite: false,
  chemicalHepaVacuumed: false,
  chemicalSanitisedPremises: false,
  actualDehumidifierQty: 0,
  actualDehumidifierDays: 0,
  actualAirMoverQty: 0,
  actualAirMoverDays: 0,
  actualAfdQty: 0,
  actualAfdDays: 0,
  actualRcdQty: 0,
  actualRcdDays: 0,
  quotedDehumidifierQty: 0,
  quotedAirMoverQty: 0,
  quotedRcdQty: 0,
  quotedEquipmentDays: 0,
  scopeChanged: false,
  scopeWhatChanged: '',
  scopeWhyChanged: '',
  scopeExtraWork: '',
  scopeReduced: '',
  requestReview: false,
  damagesPresent: false,
  damagesDetails: '',
  stainingPresent: false,
  stainingDetails: '',
  additionalNotes: '',
  officeNotes: '',
  followupRequired: false,
};
