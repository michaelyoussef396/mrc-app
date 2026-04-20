import { useNavigate } from 'react-router-dom';
import { useLeadsNeedsAttention } from '@/hooks/useLeadsNeedsAttention';
import { CheckCircle2 } from 'lucide-react';
import { formatDateAU } from '@/lib/dateUtils';

/**
 * NeedsAttentionList
 *
 * Admin dashboard card surfacing leads in `pending_review` status — jobs where
 * a technician has flagged `request_review = true` on their job completion form.
 * These require an admin to review before the job report can be approved and sent.
 *
 * Matches the visual style of the "Unassigned Leads" card in AdminDashboard.tsx
 * so it blends seamlessly into the existing layout.
 *
 * NOTE: Integration-specialist should wire in real-time refresh via Supabase
 * channel subscription on the `job_completions` table when request_review changes.
 */
export function NeedsAttentionList() {
  const navigate = useNavigate();
  const { leads, totalCount, isLoading } = useLeadsNeedsAttention();

  return (
    <div
      className="bg-white rounded-2xl p-4 md:p-6 shadow-sm"
      style={{ border: '1px solid #e5e5e5' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-base md:text-lg font-semibold"
          style={{ color: '#1d1d1f' }}
        >
          Needs Attention
        </h2>
        {totalCount > 0 && (
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)', color: '#FF9500' }}
          >
            {totalCount} pending
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="py-8 text-center">
          <div className="w-5 h-5 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : leads.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" style={{ color: '#34C759' }} />
          <p className="text-sm" style={{ color: '#86868b' }}>
            No leads need attention
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.slice(0, 5).map((lead) => (
            <div
              key={lead.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/leads/${lead.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/leads/${lead.id}`);
                }
              }}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer min-h-[56px]"
              style={{ border: '1px solid #f0f0f0' }}
              aria-label={`Review job for ${lead.fullName}`}
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium truncate" style={{ color: '#1d1d1f' }}>
                  {lead.fullName}
                </p>
                <p className="text-xs truncate" style={{ color: '#86868b' }}>
                  {[lead.addressStreet, lead.leadNumber].filter(Boolean).join(' • ')}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs" style={{ color: '#86868b' }}>
                  {formatDateAU(lead.submittedAt) || '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
