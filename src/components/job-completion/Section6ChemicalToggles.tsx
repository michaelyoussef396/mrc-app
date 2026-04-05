'use client';

import type { JobCompletionFormData } from '@/types/jobCompletion';

interface SectionProps {
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: string | boolean | number | string[]) => void;
  isReadOnly?: boolean;
}

// Ordered list of chemical toggles — field maps to JobCompletionFormData key
const CHEMICAL_TOGGLES: Array<{
  field: keyof JobCompletionFormData;
  label: string;
}> = [
  { field: 'chemicalAirFiltration', label: 'Air Filtration Device' },
  { field: 'chemicalWaterBased', label: 'Water Based Solution' },
  { field: 'chemicalSodiumHypochlorite', label: 'Sodium Hypochlorite' },
  { field: 'chemicalHepaVacuumed', label: "HEPA Vac'd" },
  { field: 'chemicalSanitisedPremises', label: 'Sanitised Premises' },
];

/**
 * Section6ChemicalToggles — 5 toggles recording which chemicals/treatments were applied.
 *
 * Each toggle records a specific chemical or sanitisation method applied during the
 * remediation job. Defaults to false; technician toggles on what was actually used.
 *
 * @param formData - Full job completion form state
 * @param onChange - Field update callback
 * @param isReadOnly - When true, all toggles are disabled
 */
export function Section6ChemicalToggles({ formData, onChange, isReadOnly = false }: SectionProps) {
  const activeCount = CHEMICAL_TOGGLES.filter(({ field }) => Boolean(formData[field])).length;

  return (
    <section aria-labelledby="chemical-toggles-heading" className="space-y-5">
      <div className="flex items-center justify-between">
        <h2
          id="chemical-toggles-heading"
          className="text-[17px] font-semibold text-[#1d1d1f]"
        >
          Chemical Toggles
        </h2>
        <span className="text-sm text-[#86868b]" aria-live="polite">
          {activeCount} of {CHEMICAL_TOGGLES.length} selected
        </span>
      </div>

      <div
        role="group"
        aria-labelledby="chemical-toggles-heading"
        className="bg-white rounded-xl overflow-hidden"
      >
        {CHEMICAL_TOGGLES.map(({ field, label }, index) => {
          const isChecked = Boolean(formData[field]);
          const isLast = index === CHEMICAL_TOGGLES.length - 1;

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
