'use client';

import type { JobCompletionFormData } from '@/types/jobCompletion';

interface SectionProps {
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: string | boolean | number | string[]) => void;
  isReadOnly?: boolean;
}

interface ToggleRowProps {
  label: string;
  field: keyof JobCompletionFormData;
  checked: boolean;
  onChange: SectionProps['onChange'];
  isReadOnly: boolean;
}

function ToggleRow({ label, field, checked, onChange, isReadOnly }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between min-h-[48px]">
      <span className="text-[15px] font-medium text-[#1d1d1f]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={isReadOnly}
        onClick={() => onChange(field, !checked)}
        className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2 disabled:opacity-50 ${
          checked ? 'bg-[#34C759]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-[20px]' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

interface ConditionalTextareaProps {
  id: string;
  label: string;
  field: keyof JobCompletionFormData;
  value: string;
  placeholder: string;
  isVisible: boolean;
  onChange: SectionProps['onChange'];
  isReadOnly: boolean;
}

function ConditionalTextarea({
  id,
  label,
  field,
  value,
  placeholder,
  isVisible,
  onChange,
  isReadOnly,
}: ConditionalTextareaProps) {
  if (!isVisible) return null;

  return (
    <div className="space-y-1.5 pt-2">
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
 * Section9JobNotes — Technician-authored notes and flags for admin attention.
 *
 * Three toggle groups with conditional textareas, plus an always-visible
 * Additional Notes field. Key business logic:
 *
 * - requestReview: when true, the lead status transitions to `pending_review`
 *   instead of `job_completed` on form submission. The integration-specialist
 *   must check this field when updating lead status.
 * - damagesPresent / stainingPresent: details surface in the Job Report PDF.
 * - additionalNotes: included in the PDF work summary section.
 *
 * @param formData - Full job completion form state
 * @param onChange - Field update callback
 * @param isReadOnly - Disables all inputs when true
 */
export function Section9JobNotes({ formData, onChange, isReadOnly = false }: SectionProps) {
  const { requestReview, damagesPresent, stainingPresent } = formData;

  return (
    <section aria-labelledby="job-notes-heading">
      <h2
        id="job-notes-heading"
        className="text-[17px] font-semibold text-[#1d1d1f] mb-4"
      >
        Job Notes
      </h2>

      <div className="space-y-3">
        {/* Group 1: Request Review */}
        <div className="bg-white rounded-xl p-5 space-y-3">
          <ToggleRow
            label="Request Admin Review"
            field="requestReview"
            checked={requestReview}
            onChange={onChange}
            isReadOnly={isReadOnly}
          />
          {requestReview && (
            <p
              role="status"
              className="text-[13px] text-amber-600 bg-amber-50 rounded-lg p-3 leading-relaxed"
            >
              This job will be flagged for admin review before the report is generated. Lead status will be set to "Pending Review".
            </p>
          )}
          {!requestReview && (
            <p className="text-[13px] text-[#86868b] leading-relaxed">
              When enabled, this job will be flagged for admin review before report generation.
            </p>
          )}
        </div>

        {/* Group 2: Damages */}
        <div className="bg-white rounded-xl p-5" aria-live="polite">
          <ToggleRow
            label="Damages Present"
            field="damagesPresent"
            checked={damagesPresent}
            onChange={onChange}
            isReadOnly={isReadOnly}
          />
          <ConditionalTextarea
            id="damages-details"
            label="Damage Details"
            field="damagesDetails"
            value={formData.damagesDetails}
            placeholder="Describe the damages observed..."
            isVisible={damagesPresent}
            onChange={onChange}
            isReadOnly={isReadOnly}
          />
        </div>

        {/* Group 3: Staining */}
        <div className="bg-white rounded-xl p-5" aria-live="polite">
          <ToggleRow
            label="Staining Present"
            field="stainingPresent"
            checked={stainingPresent}
            onChange={onChange}
            isReadOnly={isReadOnly}
          />
          <ConditionalTextarea
            id="staining-details"
            label="Staining Details"
            field="stainingDetails"
            value={formData.stainingDetails}
            placeholder="Describe the staining observed after treatment..."
            isVisible={stainingPresent}
            onChange={onChange}
            isReadOnly={isReadOnly}
          />
        </div>

        {/* Always-visible: Additional Notes */}
        <div className="bg-white rounded-xl p-5 space-y-1.5">
          <label
            htmlFor="additional-notes"
            className="block text-[15px] font-medium text-[#1d1d1f]"
          >
            Additional Notes
          </label>
          <textarea
            id="additional-notes"
            value={formData.additionalNotes}
            readOnly={isReadOnly}
            onChange={(e) => onChange('additionalNotes', e.target.value)}
            rows={4}
            placeholder="Additional notes for the report..."
            className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] read-only:bg-gray-50 read-only:text-[#86868b]"
          />
        </div>
      </div>
    </section>
  );
}
