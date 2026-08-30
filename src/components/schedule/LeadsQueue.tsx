import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeadsToSchedule } from '@/hooks/useLeadsToSchedule';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/input';
import LeadBookingCard from './LeadBookingCard';
import { BookJobSheet } from '@/components/leads/BookJobSheet';
import { filterLeadsToSchedule } from './filterLeadsToSchedule';
import { useDeepLinkLead } from './useDeepLinkLead';
import { describeDeepLinkReason } from './deepLinkLeadReason';
import { AlertCircle, CheckCircle2, Search, X } from 'lucide-react';

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
  /**
   * Lead id from /admin/schedule?lead={id}, supplied only to the instance that is
   * actually on screen. Resolved once, then the page stops supplying it.
   */
  initialExpandedLeadId?: string | null;
  /** Called once the deep link has been resolved, so the page can retire the id. */
  onDeepLinkSettled?: () => void;
}

const SEARCH_DEBOUNCE_MS = 200;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// ============================================================================
// COMPONENT
// ============================================================================

export function LeadsQueue({
  technicians,
  initialExpandedLeadId,
  onDeepLinkSettled,
}: LeadsQueueProps) {
  const { leads, totalCount, isLoading, error, refetch } = useLeadsToSchedule();
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedTerm = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS);
  const [bookJobLead, setBookJobLead] = useState<{
    id: string;
    leadNumber: string;
    fullName: string;
    propertyAddress: string;
    suburb: string;
  } | null>(null);

  const { targetLeadId, reason: deepLinkReason, dismissReason } = useDeepLinkLead({
    leadId: initialExpandedLeadId ?? null,
    leads,
    isListLoading: isLoading,
    onSettled: onDeepLinkSettled,
  });

  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const pendingScrollIdRef = useRef<string | null>(null);

  // Clearing must feel instant; the debounce only smooths typing.
  const activeTerm = searchTerm.trim() === '' ? '' : debouncedTerm;
  const isSearching = activeTerm.trim() !== '';
  const matchingIds = useMemo(
    () => new Set(filterLeadsToSchedule(leads, activeTerm).map((lead) => lead.id)),
    [leads, activeTerm],
  );

  useEffect(() => {
    if (!targetLeadId) return;
    setExpandedLeadId(targetLeadId);
    pendingScrollIdRef.current = targetLeadId;
  }, [targetLeadId]);

  // Runs after the expanded body has rendered, so the card scrolls to its final height.
  useEffect(() => {
    const id = pendingScrollIdRef.current;
    if (!id) return;
    pendingScrollIdRef.current = null;
    const card = cardRefs.current.get(id);
    if (!card || card.hidden) return;
    const reduceMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    card.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [expandedLeadId]);

  const registerCardRef = useCallback((leadId: string, element: HTMLDivElement | null) => {
    if (element) cardRefs.current.set(leadId, element);
    else cardRefs.current.delete(leadId);
  }, []);

  const handleToggle = (leadId: string) => {
    setExpandedLeadId(expandedLeadId === leadId ? null : leadId);
  };

  const handleClearSearch = () => setSearchTerm('');

  const deepLinkTechnicianName =
    technicians.find((technician) => technician.id === deepLinkReason?.assignedTo)?.name ?? null;

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
                color: '#B25E00',
              }}
            >
              {totalCount}
            </span>
          )}
        </h3>

        {/* Sort indicator (static for now - sorted by newest) */}
        <span
          className="text-sm font-medium flex items-center gap-1"
          style={{ color: '#6e6e73' }}
        >
          Newest first
        </span>
      </div>

      {/* Search - Fixed, filters the loaded list only */}
      <div
        className="flex-shrink-0 px-4 pt-3 pb-2 bg-white"
        style={{ borderBottom: '1px solid #e5e5e5' }}
      >
        <div className="relative">
          <Search
            className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: '#6e6e73' }}
            aria-hidden="true"
          />
          <Input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search leads"
            aria-label="Search leads to schedule by name, suburb, street, postcode or phone"
            className="h-12 pl-10 pr-12 text-base md:text-base"
          />
          {searchTerm !== '' && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
              style={{ color: '#6e6e73' }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* Always mounted so screen readers announce the first result, not just later edits */}
        <p
          className="mt-2 min-h-4 text-xs font-medium tabular-nums"
          style={{ color: '#6e6e73' }}
          aria-live="polite"
        >
          {isSearching ? `${matchingIds.size} of ${totalCount}` : ''}
        </p>
      </div>

      {/* Scrollable Lead Cards - Takes remaining height.
          gap (not space-y) so cards hidden by the search leave no phantom spacing. */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {deepLinkReason && (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">
              {deepLinkReason.kind === 'not_found' || deepLinkReason.kind === 'lookup_failed'
                ? "Couldn't open that lead here"
                : `Couldn't open ${deepLinkReason.leadName ?? 'that lead'} here`}
            </p>
            <p className="text-sm mt-0.5 text-amber-800 break-words">
              {describeDeepLinkReason(deepLinkReason, deepLinkTechnicianName)}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {deepLinkReason.kind !== 'not_found' && initialExpandedLeadId && (
                <Link
                  to={`/leads/${initialExpandedLeadId}`}
                  className="inline-flex items-center h-12 px-2 text-sm font-semibold text-amber-900 hover:underline"
                >
                  View lead
                </Link>
              )}
              <button
                type="button"
                onClick={dismissReason}
                className="inline-flex items-center h-12 px-2 text-sm font-medium text-amber-800 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          // Loading State
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm" style={{ color: '#6e6e73' }}>
              Loading leads...
            </p>
          </div>
        ) : error ? (
          // Error State
          <div className="py-12 text-center">
            <AlertCircle className="h-10 w-10 mb-2" style={{ color: '#FF3B30' }} />
            <p className="text-sm" style={{ color: '#D70015' }}>
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
            <p className="text-xs mt-1" style={{ color: '#6e6e73' }}>
              No leads waiting to be scheduled
            </p>
          </div>
        ) : (
          <>
            {matchingIds.size === 0 && (
              // No-match State — the lead may exist and still never appear in this list
              <div className="py-10 px-2 text-center" role="status">
                <Search
                  className="h-10 w-10 mb-3 mx-auto opacity-40"
                  style={{ color: '#6e6e73' }}
                  aria-hidden="true"
                />
                <p className="text-sm font-medium break-words" style={{ color: '#1d1d1f' }}>
                  No match for “{activeTerm.trim()}” in To Schedule
                </p>
                <p className="text-sm mt-1" style={{ color: '#5c5c61' }}>
                  This list only shows unassigned new leads and jobs awaiting booking. A lead that is
                  already assigned, booked or archived won't appear here even though it exists.
                </p>
                <Link
                  to="/admin/leads"
                  className="inline-flex items-center justify-center h-12 mt-2 px-3 text-sm font-semibold hover:underline"
                  style={{ color: '#0060DF' }}
                >
                  Search all leads in Leads Management
                </Link>
              </div>
            )}

            {/* Every card stays mounted and non-matching ones are hidden: unmounting an
                expanded card would discard the booking form the admin is filling in. */}
            {leads.map((lead) => (
              <div
                key={lead.id}
                ref={(element) => registerCardRef(lead.id, element)}
                hidden={!matchingIds.has(lead.id)}
                className="scroll-mt-4"
              >
                {lead.scheduleType === 'job' ? (
                  <div
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
                          <p className="text-xs text-[#6e6e73] truncate">{lead.suburb || 'No suburb'}</p>
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
                    lead={lead}
                    technicians={technicians}
                    isExpanded={expandedLeadId === lead.id}
                    onToggle={() => handleToggle(lead.id)}
                  />
                )}
              </div>
            ))}
          </>
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
