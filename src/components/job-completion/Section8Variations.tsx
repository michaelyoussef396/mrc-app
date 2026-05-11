'use client';

import type { JobCompletionFormData } from '@/types/jobCompletion';

interface SectionProps {
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: string | boolean | number | string[]) => void;
  isReadOnly?: boolean;
}

interface VariationTextareaProps {
  id: string;
  label: string;
  field: keyof JobCompletionFormData;
  value: string;
  placeholder: string;
  onChange: SectionProps['onChange'];
  isReadOnly: boolean;
}

function VariationTextarea({
  id,
  label,
  field,
  value,
  placeholder,
  onChange,
  isReadOnly,
}: VariationTextareaProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[15px] font-medium text-[#1d1d1f]"
      >
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        readOnly={isReadOnly}
        onChange={(e) => onChange(field, e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] read-only:bg-gray-50 read-only:text-[#86868b]"
      />
    </div>
  );
}

/**
 * Section8Variations — Records any scope deviations from the original inspection quote.
 *
 * The "Scope Changed" toggle controls visibility of four conditional textarea fields.
 * Captured data is for admin context only — customer-facing PDF rendering of variations
 * is intentionally out of scope (separate IP decision). Admin surfaces the captured fields
 * via the variation context panel on LeadDetail, which pulls original quote from
 * `inspections` + current state from `job_completions` + change timeline from `audit_logs`.
 *
 * @param formData - Full job completion form state
 * @param onChange - Field update callback
 * @param isReadOnly - Disables all inputs when true
 */
export function Section8Variations({ formData, onChange, isReadOnly = false }: SectionProps) {
  const { scopeChanged } = formData;

  return (
    <section aria-labelledby="variations-heading">
      <div className="space-y-3">
        {/* Scope Changed toggle */}
        <div className="bg-white rounded-xl p-5">
          <h2
            id="variations-heading"
            className="text-[17px] font-semibold text-[#1d1d1f] mb-1"
          >
            Variation Tracking
          </h2>
          <p className="text-[13px] text-[#86868b] mb-4">
            Record any changes from the original inspection quote.
          </p>

          <div className="flex items-center justify-between min-h-[48px]">
            <span className="text-[15px] font-medium text-[#1d1d1f]">Scope Changed</span>
            <button
              type="button"
              role="switch"
              aria-checked={scopeChanged}
              aria-label="Scope Changed"
              disabled={isReadOnly}
              onClick={() => onChange('scopeChanged', !scopeChanged)}
              className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2 disabled:opacity-50 ${
                scopeChanged ? 'bg-[#34C759]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  scopeChanged ? 'translate-x-[20px]' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Conditional variation fields */}
        <div
          aria-live="polite"
          className={`overflow-hidden transition-all duration-300 ${
            scopeChanged ? 'opacity-100' : 'opacity-0 pointer-events-none h-0'
          }`}
        >
          {scopeChanged && (
            <div className="bg-white rounded-xl p-5 space-y-5">
              <VariationTextarea
                id="scope-what-changed"
                label="What Changed"
                field="scopeWhatChanged"
                value={formData.scopeWhatChanged}
                placeholder="Describe what changed from the original scope..."
                onChange={onChange}
                isReadOnly={isReadOnly}
              />
              <VariationTextarea
                id="scope-why-changed"
                label="Why Changed"
                field="scopeWhyChanged"
                value={formData.scopeWhyChanged}
                placeholder="Explain the reason for the scope change..."
                onChange={onChange}
                isReadOnly={isReadOnly}
              />
              <VariationTextarea
                id="scope-extra-work"
                label="Extra Work Performed"
                field="scopeExtraWork"
                value={formData.scopeExtraWork}
                placeholder="Describe any extra work performed beyond the original scope..."
                onChange={onChange}
                isReadOnly={isReadOnly}
              />
              <VariationTextarea
                id="scope-reduced"
                label="Scope Reduced"
                field="scopeReduced"
                value={formData.scopeReduced}
                placeholder="Describe any scope that was not completed or was reduced..."
                onChange={onChange}
                isReadOnly={isReadOnly}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
