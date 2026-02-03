import { useState } from 'react';
import { useLeadsToSchedule } from '@/hooks/useLeadsToSchedule';
import LeadBookingCard from './LeadBookingCard';

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
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LeadsQueue({ technicians }: LeadsQueueProps) {
  const { leads, totalCount, isLoading, error } = useLeadsToSchedule();
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  const handleToggle = (leadId: string) => {
    setExpandedLeadId(expandedLeadId === leadId ? null : leadId);
  };

  return (
    <aside
      className="w-full lg:w-2/5 flex flex-col shadow-xl z-20"
      style={{
        backgroundColor: '#f6f7f8',
        borderLeft: '1px solid #e5e5e5',
      }}
    >
      {/* Header */}
      <div
        className="p-6 pb-4 flex justify-between items-center bg-white"
        style={{ borderBottom: '1px solid #e5e5e5' }}
      >
        <h3
          className="text-xl font-bold leading-tight tracking-tight"
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

      {/* Scrollable Lead Cards */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 no-scrollbar">
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
            <span
              className="material-symbols-outlined text-4xl mb-2"
              style={{ color: '#FF3B30' }}
            >
              error
            </span>
            <p className="text-sm" style={{ color: '#FF3B30' }}>
              {error}
            </p>
          </div>
        ) : leads.length === 0 ? (
          // Empty State
          <div className="py-12 text-center">
            <span
              className="material-symbols-outlined text-4xl mb-3 opacity-50"
              style={{ color: '#34C759' }}
            >
              check_circle
            </span>
            <p className="text-sm font-medium" style={{ color: '#1d1d1f' }}>
              All caught up!
            </p>
            <p className="text-xs mt-1" style={{ color: '#86868b' }}>
              No leads waiting to be scheduled
            </p>
          </div>
        ) : (
          // Lead Cards
          leads.map((lead) => (
            <LeadBookingCard
              key={lead.id}
              lead={lead}
              technicians={technicians}
              isExpanded={expandedLeadId === lead.id}
              onToggle={() => handleToggle(lead.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}

export default LeadsQueue;
