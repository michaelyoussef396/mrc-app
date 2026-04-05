'use client';

import type { JobCompletionFormData } from '@/types/jobCompletion';

interface SectionProps {
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: string | boolean | number | string[]) => void;
  isReadOnly?: boolean;
}

// Ordered list of treatment method toggles — field maps to JobCompletionFormData key
const TREATMENT_METHODS: Array<{
  field: keyof JobCompletionFormData;
  label: string;
}> = [
  { field: 'methodHepaVacuuming', label: 'HEPA Vacuuming' },
  { field: 'methodSurfaceMouldRemediation', label: 'Surface Mould Remediation' },
  { field: 'methodUlvFoggingProperty', label: 'ULV Fogging Property' },
  { field: 'methodUlvFoggingSubfloor', label: 'ULV Fogging Subfloor' },
  { field: 'methodSubfloorRemediation', label: 'Subfloor Remediation' },
  { field: 'methodAfdInstallation', label: 'AFD Installation' },
  { field: 'methodDryingEquipment', label: 'Drying Equipment' },
  { field: 'methodContainmentPrv', label: 'Containment & PRV' },
  { field: 'methodMaterialDemolition', label: 'Material Demolition' },
  { field: 'methodCavityTreatment', label: 'Cavity Treatment' },
  { field: 'methodDebrisRemoval', label: 'Debris Removal' },
];

/**
 * Section5TreatmentMethods — 11 toggles recording which treatment methods were used.
 *
 * Defaults are pre-populated from the inspection record's treatment_methods array
 * (handled by the parent form). The technician can toggle each method on or off
 * to reflect what was actually performed on-site.
 *
 * @param formData - Full job completion form state
 * @param onChange - Field update callback
 * @param isReadOnly - When true, all toggles are disabled
 */
export function Section5TreatmentMethods({ formData, onChange, isReadOnly = false }: SectionProps) {
  const activeCount = TREATMENT_METHODS.filter(({ field }) => Boolean(formData[field])).length;

  return (
    <section aria-labelledby="treatment-methods-heading" className="space-y-5">
      <div className="flex items-center justify-between">
        <h2
          id="treatment-methods-heading"
          className="text-[17px] font-semibold text-[#1d1d1f]"
        >
          Treatment Methods
        </h2>
        <span className="text-sm text-[#86868b]" aria-live="polite">
          {activeCount} of {TREATMENT_METHODS.length} selected
        </span>
      </div>

      <div
        role="group"
        aria-labelledby="treatment-methods-heading"
        className="bg-white rounded-xl overflow-hidden"
      >
        {TREATMENT_METHODS.map(({ field, label }, index) => {
          const isChecked = Boolean(formData[field]);
          const isLast = index === TREATMENT_METHODS.length - 1;

          return (
            <div
              key={field}
              className={`flex items-center justify-between px-4 min-h-[48px] ${
                !isLast ? 'border-b border-gray-100' : ''
              }`}
            >
              <label
                htmlFor={field}
                className="text-[15px] font-medium text-[#1d1d1f] cursor-pointer py-3 flex-1"
              >
                {label}
              </label>
              <button
                id={field}
                type="button"
                role="switch"
                aria-checked={isChecked}
                onClick={() => onChange(field, !isChecked)}
                disabled={isReadOnly}
                className={`relative flex-shrink-0 w-[51px] h-[31px] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2 disabled:opacity-50 ml-4 ${
                  isChecked ? 'bg-[#34C759]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm transition-transform ${
                    isChecked ? 'translate-x-[20px]' : ''
                  }`}
                  aria-hidden="true"
                />
                <span className="sr-only">{label}: {isChecked ? 'On' : 'Off'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
