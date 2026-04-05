'use client';

import type { JobCompletionFormData, PremisesType } from '@/types/jobCompletion';

interface SectionProps {
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: string | boolean | number | string[]) => void;
  isReadOnly?: boolean;
}

// NOTE: Inline toggle avoids importing a separate Toggle component and keeps this
// section self-contained, consistent with the toggle pattern used across the form.
interface ToggleRowProps {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function ToggleRow({ id, label, checked, onToggle, disabled = false }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl">
      <label htmlFor={id} className="text-[15px] font-medium text-[#1d1d1f] cursor-pointer">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        disabled={disabled}
        className={`relative w-[51px] h-[31px] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2 disabled:opacity-50 ${
          checked ? 'bg-[#34C759]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm transition-transform ${
            checked ? 'translate-x-[20px]' : ''
          }`}
          aria-hidden="true"
        />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}

/**
 * Section2Summary — Overview of the completed remediation work.
 *
 * Collects the SWMS status, premises type, completion date, and which
 * inspection areas were treated. Areas treated defaults to whatever was
 * identified during the inspection (pre-populated by the parent form).
 *
 * @param formData - Full job completion form state
 * @param onChange - Field update callback
 * @param isReadOnly - When true, all fields are locked
 */
export function Section2Summary({ formData, onChange, isReadOnly = false }: SectionProps) {
  const today = new Date().toISOString().split('T')[0];

  function handleAreaToggle(areaName: string) {
    const current = formData.areasTreated;
    const updated = current.includes(areaName)
      ? current.filter((a) => a !== areaName)
      : [...current, areaName];
    onChange('areasTreated', updated);
  }

  // Format ISO date to DD/MM/YYYY for display in the date input's label
  function formatDateDisplay(isoDate: string): string {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }

  return (
    <section aria-labelledby="summary-heading" className="space-y-5">
      <h2
        id="summary-heading"
        className="text-[17px] font-semibold text-[#1d1d1f]"
      >
        Summary
      </h2>

      {/* SWMS Completed */}
      <ToggleRow
        id="swms-completed"
        label="SWMS Completed"
        checked={formData.swmsCompleted}
        onToggle={() => onChange('swmsCompleted', !formData.swmsCompleted)}
        disabled={isReadOnly}
      />

      {/* Premises Type */}
      <div>
        <label
          htmlFor="premises-type"
          className="block text-sm font-medium text-[#1d1d1f] mb-1.5"
        >
          Premises Type <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <select
          id="premises-type"
          value={formData.premisesType}
          onChange={(e) => onChange('premisesType', e.target.value as PremisesType)}
          disabled={isReadOnly}
          required
          aria-required="true"
          className="w-full h-12 px-3 rounded-lg border border-gray-200 text-[15px] text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent disabled:bg-gray-50 disabled:text-[#86868b] appearance-none"
        >
          <option value="" disabled>Select premises type</option>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
        </select>
      </div>

      {/* Completion Date */}
      <div>
        <label
          htmlFor="completion-date"
          className="block text-sm font-medium text-[#1d1d1f] mb-1.5"
        >
          Completion Date <span className="text-red-500" aria-hidden="true">*</span>
          {formData.completionDate && (
            <span className="ml-2 text-[#86868b] font-normal">
              ({formatDateDisplay(formData.completionDate)})
            </span>
          )}
        </label>
        <input
          id="completion-date"
          type="date"
          value={formData.completionDate}
          max={today}
          onChange={(e) => onChange('completionDate', e.target.value)}
          disabled={isReadOnly}
          required
          aria-required="true"
          className="w-full h-12 px-3 rounded-lg border border-gray-200 text-[15px] text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent disabled:bg-gray-50 disabled:text-[#86868b]"
        />
      </div>

      {/* Areas Treated */}
      <div>
        <p className="text-sm font-medium text-[#1d1d1f] mb-2">
          Areas Treated <span className="text-red-500" aria-hidden="true">*</span>
        </p>
        <div
          role="group"
          aria-label="Select areas that were treated"
          className="bg-white rounded-xl overflow-hidden"
        >
          {formData.areasTreated.length === 0 ? (
            <p className="p-4 text-[15px] text-[#86868b] italic">
              No areas from inspection. Areas will appear here once pre-populated.
            </p>
          ) : (
            formData.areasTreated.map((area, index) => {
              const checkboxId = `area-${index}`;
              return (
                <label
                  key={area}
                  htmlFor={checkboxId}
                  className={`flex items-center gap-3 px-4 min-h-[48px] cursor-pointer ${
                    index < formData.areasTreated.length - 1 ? 'border-b border-gray-100' : ''
                  } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={true}
                    onChange={() => !isReadOnly && handleAreaToggle(area)}
                    disabled={isReadOnly}
                    className="w-5 h-5 rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF] focus:ring-offset-0"
                  />
                  <span className="text-[15px] text-[#1d1d1f]">{area}</span>
                </label>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
