'use client';

import type { JobCompletionFormData } from '@/types/jobCompletion';

interface SectionProps {
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: string | boolean | number | string[]) => void;
  isReadOnly?: boolean;
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <p className="text-xs font-medium text-[#86868b] uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-[15px] font-medium text-[#1d1d1f]">{value || '—'}</p>
    </div>
  );
}

/**
 * Section1OfficeInfo — Read-only header card identifying the job.
 *
 * Displays auto-populated office details (job number, address, requested by)
 * from the parent lead/inspection record. Only "Attention To" is editable by
 * the technician, allowing them to direct the report to a specific contact.
 *
 * @param formData - Full job completion form state
 * @param onChange - Field update callback (only attentionTo is writable here)
 * @param isReadOnly - When true, attentionTo input is also locked
 */
export function Section1OfficeInfo({ formData, onChange, isReadOnly = false }: SectionProps) {
  return (
    <section aria-labelledby="office-info-heading">
      <div className="bg-white rounded-xl p-5">
        <h2
          id="office-info-heading"
          className="text-[17px] font-semibold text-[#1d1d1f] mb-4"
        >
          Office Information
        </h2>

        <div className="space-y-0">
          <InfoRow label="Job Number" value={formData.jobNumber} />
          <InfoRow label="Property Address" value={formData.addressSnapshot} />
          <InfoRow label="Requested By" value={formData.requestedBy} />
        </div>

        {/* Attention To — the one editable field in this section */}
        <div className="mt-4">
          <label
            htmlFor="attention-to"
            className="block text-sm font-medium text-[#1d1d1f] mb-1.5"
          >
            Attention To
          </label>
          <input
            id="attention-to"
            type="text"
            value={formData.attentionTo}
            onChange={(e) => onChange('attentionTo', e.target.value)}
            disabled={isReadOnly}
            placeholder="e.g. Property Manager, Owner"
            className="w-full h-12 px-3 rounded-lg border border-gray-200 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent disabled:bg-gray-50 disabled:text-[#86868b]"
            aria-label="Attention To — who this report is directed to"
          />
        </div>
      </div>
    </section>
  );
}
