import { useEffect, useState } from 'react';
import { useLeadsToSchedule } from '@/hooks/useLeadsToSchedule';
import LeadBookingCard from './LeadBookingCard';
import { BookJobSheet } from '@/components/leads/BookJobSheet';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Technician {
  id: string;
  name: string;
  color: string;
}

interface LeadsQueueProps {
  technicians: Technician[];
  /** Lead id to auto-expand on mount (from /admin/schedule?lead={id}). */
  initialExpandedLeadId?: string | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LeadsQueue({ technicians, initialExpandedLeadId }: LeadsQueueProps) {
  const { leads, totalCount, isLoading, error, refetch } = useLeadsToSchedule();
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(initialExpandedLeadId ?? null);

  // When ?lead={id} is set, auto-expand once the matching lead lands in the result set.
  // We also re-run if the URL param changes (admin navigates between deep-link URLs).
  useEffect(() => {
    if (!initialExpandedLeadId) return;
    if (leads.some((l) => l.id === initialExpandedLeadId)) {
      setExpandedLeadId(initialExpandedLeadId);
    }
  }, [initialExpandedLeadId, leads]);
  const [bookJobLead, setBookJobLead] = useState<{
    id: string;
    leadNumber: string;
    fullName: string;
    propertyAddress: string;
    suburb: string;
  } | null>(null);

  const handleToggle = (leadId: string) => {
    setExpandedLeadId(expandedLeadId === leadId ? null : leadId);
  };

  return (
    <div
      className="h-full flex flex-col"
      style={{
        backgroundColor: '#f6f7f8',
        borderLeft: '1px solid #e5e5e5',
      }}
    >
      {/* Header - Fixed */}
      <div
        className="flex-shrink-0 px-5 py-4 flex justify-between items-center bg-white"
        style={{ borderBottom: '1px solid #e5e5e5' }}
      >
        <h3
          className="text-lg font-bold leading-tight tracking-tight"
          style={{ color: '#1d1d1f' }}
        >
          To Schedule
          {totalCount > 0 && (
            <span
              className="ml-2 px-2 py-0.5 rounded-full text-sm font-semibold"
              style={{
                backgroundColor: 'rgba(255, 149, 0, 0.15)',
                color: '#FF9500',
              }}
            >
              {totalCount}
            </span>
          )}
        </h3>

        {/* Sort indicator (static for now - sorted by newest) */}
        <span
          className="text-sm font-medium flex items-center gap-1"
          style={{ color: '#86868b' }}
        >
          Newest first
        </span>
      </div>

      {/* Scrollable Lead Cards - Takes remaining height */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          // Loading State
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm" style={{ color: '#86868b' }}>
              Loading leads...
            </p>
          </div>
        ) : error ? (
          // Error State
          <div className="py-12 text-center">
            <AlertCircle className="h-10 w-10 mb-2" style={{ color: '#FF3B30' }} />
            <p className="text-sm" style={{ color: '#FF3B30' }}>
              {error}
            </p>
          </div>
        ) : leads.length === 0 ? (
          // Empty State
          <div className="py-12 text-center">
            <CheckCircle2 className="h-10 w-10 mb-3 opacity-50" style={{ color: '#34C759' }} />
            <p className="text-sm font-medium" style={{ color: '#1d1d1f' }}>
              All caught up!
            </p>
            <p className="text-xs mt-1" style={{ color: '#86868b' }}>
              No leads waiting to be scheduled
            </p>
          </div>
        ) : (
          // Lead Cards — job leads get a compact card, inspection leads get the full LeadBookingCard
          leads.map((lead) =>
            lead.scheduleType === 'job' ? (
              <div
                key={lead.id}
                className="bg-white rounded-lg border border-amber-200 p-4 space-y-3"
                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 flex-shrink-0">
                      <span className="text-xs font-bold text-amber-700">{lead.initials}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate text-[#1d1d1f]">{lead.displayName}</p>
                      <p className="text-xs text-[#86868b] truncate">{lead.suburb || 'No suburb'}</p>
                    </div>
                  </div>
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 uppercase tracking-wide">
                    Job to Book
                  </span>
                </div>
                <button
                  onClick={() =>
                    setBookJobLead({
                      id: lead.id,
                      leadNumber: lead.leadNumber,
                      fullName: lead.fullName,
                      propertyAddress: lead.propertyAddress,
                      suburb: lead.suburb,
                    })
                  }
                  className="w-full h-11 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
                >
                  Book Job
                </button>
              </div>
            ) : (
              <LeadBookingCard
                key={lead.id}
                lead={lead}
                technicians={technicians}
                isExpanded={expandedLeadId === lead.id}
                onToggle={() => handleToggle(lead.id)}
              />
            )
          )
        )}
      </div>

      {/* Book Job Sheet — slide-out drawer */}
      {bookJobLead && (
        <BookJobSheet
          open={!!bookJobLead}
          onOpenChange={(open) => {
            if (!open) {
              setBookJobLead(null);
              refetch();
            }
          }}
          leadId={bookJobLead.id}
          leadNumber={bookJobLead.leadNumber}
          customerName={bookJobLead.fullName}
          propertyAddress={bookJobLead.propertyAddress}
          propertySuburb={bookJobLead.suburb}
          onBooked={() => refetch()}
        />
      )}
    </div>
  );
}

export default LeadsQueue;
