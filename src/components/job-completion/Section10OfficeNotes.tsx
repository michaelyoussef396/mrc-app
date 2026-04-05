'use client';

import type { JobCompletionFormData } from '@/types/jobCompletion';

interface SectionProps {
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: string | boolean | number | string[]) => void;
  isReadOnly?: boolean;
}

interface Section10Props extends SectionProps {
  /** When false, renders an access-denied message. Never pass admin-only data to non-admin renders. */
  isAdmin: boolean;
}

/**
 * Section10OfficeNotes — Admin-only internal notes, never visible to customers.
 *
 * Access is controlled via the isAdmin prop. When false, a placeholder message is
 * shown instead of the fields. The parent page (TechnicianJobCompletionForm) must
 * derive isAdmin from useAuth().hasRole('admin') — this component trusts the prop.
 *
 * Business rules:
 * - officeNotes: internal only, NOT included in the Job Report PDF or any customer email.
 * - followupRequired: flags the lead for admin follow-up. The integration-specialist
 *   should surface this in the AdminDashboard pending-review widget.
 *
 * Integration note: the integration-specialist should verify the RLS policy on
 * job_completions prevents non-admin users from reading office_notes and
 * followup_required columns directly.
 *
 * @param formData - Full job completion form state
 * @param onChange - Field update callback
 * @param isReadOnly - Disables all inputs when true
 * @param isAdmin - When false, hides all content and shows access message
 */
export function Section10OfficeNotes({ formData, onChange, isReadOnly = false, isAdmin }: Section10Props) {
  const { followupRequired } = formData;

  return (
    <section aria-labelledby="office-notes-heading">
      <h2
        id="office-notes-heading"
        className="text-[17px] font-semibold text-[#1d1d1f] mb-4"
      >
        Office Notes
      </h2>

      {!isAdmin ? (
        <div
          role="status"
          className="bg-white rounded-xl p-5 flex items-start gap-3"
        >
          {/* Lock icon via inline SVG — no icon library import needed for a single glyph */}
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 text-[#86868b] mt-0.5 shrink-0"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="text-[15px] text-[#86868b] leading-relaxed">
            Office notes are only visible to admin users.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Office Notes textarea */}
          <div className="bg-white rounded-xl p-5 space-y-1.5">
            <label
              htmlFor="office-notes"
              className="block text-[15px] font-medium text-[#1d1d1f]"
            >
              Office Notes
            </label>
            <p className="text-[13px] text-[#86868b] mb-2">
              Internal only — not visible to the customer or included in any report.
            </p>
            <textarea
              id="office-notes"
              value={formData.officeNotes}
              readOnly={isReadOnly}
              onChange={(e) => onChange('officeNotes', e.target.value)}
              rows={4}
              placeholder="Internal notes (not visible to customer)..."
              className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] read-only:bg-gray-50 read-only:text-[#86868b]"
            />
          </div>

          {/* Follow-up Required toggle */}
          <div className="bg-white rounded-xl p-5">
            <div className="flex items-center justify-between min-h-[48px]">
              <span className="text-[15px] font-medium text-[#1d1d1f]">Follow-up Required</span>
              <button
                type="button"
                role="switch"
                aria-checked={followupRequired}
                aria-label="Follow-up Required"
                disabled={isReadOnly}
                onClick={() => onChange('followupRequired', !followupRequired)}
                className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2 disabled:opacity-50 ${
                  followupRequired ? 'bg-[#34C759]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    followupRequired ? 'translate-x-[20px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {followupRequired && (
              <p
                role="status"
                className="text-[13px] text-amber-600 bg-amber-50 rounded-lg p-3 mt-3 leading-relaxed"
              >
                This job will appear in the admin dashboard follow-up queue.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
