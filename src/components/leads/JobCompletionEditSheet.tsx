'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import {
  Section1OfficeInfo,
  Section2Summary,
  Section3BeforePhotos,
  Section4AfterPhotos,
  Section5TreatmentMethods,
  Section6ChemicalToggles,
  Section7Equipment,
  Section8Variations,
  Section9JobNotes,
  Section10OfficeNotes,
} from '@/components/job-completion';
import { rowToFormData } from '@/hooks/useJobCompletionForm';
import { updateJobCompletion } from '@/lib/api/jobCompletions';
import { logFieldEdits, diffRows } from '@/lib/api/fieldEditLog';

import type { JobCompletionRow, JobCompletionFormData } from '@/types/jobCompletion';

// Per-section field → human label map for the field_edit activity log.
// Photos (sections 3 & 4) are handled by separate upload hooks and skipped here.
const SECTION_FIELD_MAPS: Record<
  number,
  Partial<Record<keyof JobCompletionFormData, string>>
> = {
  1: { attentionTo: 'Attention To' },
  2: {
    swmsCompleted: 'SWMS Completed',
    premisesType: 'Premises Type',
    remediationCompletedBy: 'Completed By',
    completionDate: 'Completion Date',
    areasTreated: 'Areas Treated',
  },
  3: {},
  4: { demolitionWorks: 'Demolition Works' },
  5: {
    methodHepaVacuuming: 'HEPA Vacuuming',
    methodSurfaceMouldRemediation: 'Surface Mould Remediation',
    methodUlvFoggingProperty: 'ULV Fogging Property',
    methodUlvFoggingSubfloor: 'ULV Fogging Subfloor',
    methodSubfloorRemediation: 'Subfloor Remediation',
    methodAfdInstallation: 'AFD Installation',
    methodDryingEquipment: 'Drying Equipment',
    methodContainmentPrv: 'Containment & PRV',
    methodMaterialDemolition: 'Material Demolition',
    methodCavityTreatment: 'Cavity Treatment',
    methodDebrisRemoval: 'Debris Removal',
  },
  6: {
    chemicalAirFiltration: 'Air Filtration',
    chemicalWaterBased: 'Water Based',
    chemicalSodiumHypochlorite: 'Sodium Hypochlorite',
    chemicalHepaVacuumed: "HEPA Vac'd",
    chemicalSanitisedPremises: 'Sanitised Premises',
  },
  7: {
    actualDehumidifierQty: 'Dehumidifier Qty',
    actualDehumidifierDays: 'Dehumidifier Days',
    actualAirMoverQty: 'Air Mover Qty',
    actualAirMoverDays: 'Air Mover Days',
    actualAfdQty: 'AFD Qty',
    actualAfdDays: 'AFD Days',
    actualRcdQty: 'RCD Qty',
    actualRcdDays: 'RCD Days',
  },
  8: {
    scopeChanged: 'Scope Changed',
    scopeWhatChanged: 'What Changed',
    scopeWhyChanged: 'Why Changed',
    scopeExtraWork: 'Extra Work',
    scopeReduced: 'Scope Reduced',
  },
  9: {
    requestReview: 'Review Requested',
    damagesPresent: 'Damages Present',
    damagesDetails: 'Damages Details',
    stainingPresent: 'Staining Present',
    stainingDetails: 'Staining Details',
    additionalNotes: 'Additional Notes',
  },
  10: {
    officeNotes: 'Office Notes',
    followupRequired: 'Followup Required',
  },
};

// Human-readable names for each section, indexed 1–10.
const SECTION_NAMES: Record<number, string> = {
  1: 'Office Info',
  2: 'Summary',
  3: 'Before Photos',
  4: 'After Photos',
  5: 'Treatment Methods',
  6: 'Chemical Toggles',
  7: 'Equipment',
  8: 'Variations',
  9: 'Job Notes',
  10: 'Office Notes',
};

interface JobCompletionEditSheetProps {
  sectionIndex: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  jobCompletion: JobCompletionRow;
  leadId: string;
  isAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/**
 * JobCompletionEditSheet — Slide-out sheet for admins to edit a single job
 * completion section without leaving the LeadDetail page.
 *
 * Converts the current JobCompletionRow into form state via rowToFormData,
 * renders the appropriate Section component in edit mode, and persists
 * changes via updateJobCompletion when the admin taps Save.
 *
 * Unsaved changes are guarded by a browser confirm on close.
 * Activity is logged to the activities table on every successful save.
 *
 * @param sectionIndex - Which of the 10 sections to render (1–10 union)
 * @param jobCompletion - The current DB row (converted to form state internally)
 * @param leadId - Lead this job completion belongs to
 * @param isAdmin - Passed through to Section10 access control
 * @param open - Sheet open state (controlled externally)
 * @param onOpenChange - Open state setter (controlled externally)
 * @param onSaved - Called after a successful save so the parent can refetch
 */
export function JobCompletionEditSheet({
  sectionIndex,
  jobCompletion,
  leadId,
  isAdmin,
  open,
  onOpenChange,
  onSaved,
}: JobCompletionEditSheetProps) {
  const [formData, setFormData] = useState<JobCompletionFormData>(() =>
    rowToFormData(jobCompletion)
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const initialFormDataRef = useRef<JobCompletionFormData | null>(null);

  // Reset form state whenever the sheet opens on a (potentially different) section
  // or when the underlying jobCompletion row changes.
  useEffect(() => {
    if (open) {
      const initial = rowToFormData(jobCompletion);
      setFormData(initial);
      initialFormDataRef.current = initial;
      setIsDirty(false);
    } else {
      initialFormDataRef.current = null;
    }
  }, [open, jobCompletion]);

  const sectionName = SECTION_NAMES[sectionIndex];

  function handleChange(
    field: keyof JobCompletionFormData,
    value: JobCompletionFormData[keyof JobCompletionFormData]
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }

  function handleRequestClose(nextOpen: boolean) {
    if (!nextOpen && isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Close without saving?'
      );
      if (!confirmed) return;
    }
    onOpenChange(nextOpen);
  }

  async function handleSave() {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      const changes = diffRows(
        initialFormDataRef.current as unknown as Record<string, unknown> | null,
        formData as unknown as Record<string, unknown>,
        SECTION_FIELD_MAPS[sectionIndex] as Partial<Record<string, string>>,
      );

      await updateJobCompletion(jobCompletion.id, formData);

      await logFieldEdits({
        leadId,
        entityType: 'job_completion',
        entityId: jobCompletion.id,
        changes,
      });

      toast.success('Saved');
      setIsDirty(false);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed.';
      toast.error('Could not save', { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleRequestClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto flex flex-col p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <SheetTitle className="text-base">
            Edit Section {sectionIndex} — {sectionName}
          </SheetTitle>
        </SheetHeader>

        {/* Scrollable section body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <SectionRenderer
            sectionIndex={sectionIndex}
            formData={formData}
            onChange={handleChange}
            leadId={leadId}
            jobCompletionId={jobCompletion.id}
            isAdmin={isAdmin}
          />
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 border-t border-gray-100 px-5 py-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => handleRequestClose(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Internal: picks the right Section component to render
// ---------------------------------------------------------------------------

interface SectionRendererProps {
  sectionIndex: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: JobCompletionFormData[keyof JobCompletionFormData]) => void;
  leadId: string;
  jobCompletionId: string;
  isAdmin: boolean;
}

function SectionRenderer({
  sectionIndex,
  formData,
  onChange,
  leadId,
  jobCompletionId,
  isAdmin,
}: SectionRendererProps) {
  const sharedProps = { formData, onChange, isReadOnly: false };

  switch (sectionIndex) {
    case 1:
      return <Section1OfficeInfo {...sharedProps} />;
    case 2:
      return <Section2Summary {...sharedProps} />;
    case 3:
      return (
        <Section3BeforePhotos
          {...sharedProps}
          leadId={leadId}
          jobCompletionId={jobCompletionId}
        />
      );
    case 4:
      return (
        <Section4AfterPhotos
          {...sharedProps}
          leadId={leadId}
          jobCompletionId={jobCompletionId}
        />
      );
    case 5:
      return <Section5TreatmentMethods {...sharedProps} />;
    case 6:
      return <Section6ChemicalToggles {...sharedProps} />;
    case 7:
      return <Section7Equipment {...sharedProps} />;
    case 8:
      return <Section8Variations {...sharedProps} />;
    case 9:
      return <Section9JobNotes {...sharedProps} />;
    case 10:
      return <Section10OfficeNotes {...sharedProps} isAdmin={isAdmin} />;
  }
}
