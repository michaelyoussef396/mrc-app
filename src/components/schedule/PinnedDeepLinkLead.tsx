import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

import { buildPinnedLeadView, describePinnedBooking } from './deepLinkLeadReason';
import type { DeepLinkPin } from './useDeepLinkLead';

interface Technician {
  id: string;
  name: string;
}

interface PinnedDeepLinkLeadProps {
  /** The deep-linked lead the rail cannot list. Null renders nothing. */
  pin: DeepLinkPin | null;
  technicians: Technician[];
  onDismiss: () => void;
}

/**
 * The lead behind /admin/schedule?lead={id} when the rail's own list will never show
 * it — already booked, assigned, archived, or gone. Pinned above the scrolling list
 * rather than inside it, so it survives a scroll through the queue.
 *
 * Read-only: it identifies the lead and links to its page. Rescheduling from here is
 * deliberately not offered.
 */
export function PinnedDeepLinkLead({ pin, technicians, onDismiss }: PinnedDeepLinkLeadProps) {
  if (!pin) return null;

  // Resolved at render so a late useTechnicians result still names the technician.
  const technicianName =
    technicians.find((technician) => technician.id === pin.reason.assignedTo)?.name ?? null;
  const view = buildPinnedLeadView({
    leadId: pin.leadId,
    row: pin.row,
    reason: pin.reason,
    technicianName,
  });

  return (
    <section
      aria-label="Lead opened from a link"
      className="flex-shrink-0 px-4 py-3"
      style={{ backgroundColor: '#eef5ff', borderBottom: '1px solid #cfe0fb' }}
    >
      <div
        role="status"
        className="relative rounded-lg bg-white p-3 pr-12"
        style={{ border: '1px solid #b9d4fb', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss the lead opened from a link"
          className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          style={{ color: '#5c5c61' }}
        >
          <X className="h-4 w-4" />
        </button>

        <p
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: '#0057B8' }}
        >
          Opened from lead
        </p>

        <p className="mt-1 text-sm font-semibold break-words" style={{ color: '#1d1d1f' }}>
          {view.name}
        </p>
        {view.leadNumber && (
          <p className="text-xs tabular-nums break-words" style={{ color: '#5c5c61' }}>
            {view.leadNumber}
          </p>
        )}
        {view.address && (
          <p className="text-xs break-words" style={{ color: '#5c5c61' }}>
            {view.address}
          </p>
        )}

        {view.statusLabel && (
          <p className="mt-2 text-xs break-words" style={{ color: '#5c5c61' }}>
            Status:{' '}
            <span className="font-medium" style={{ color: '#1d1d1f' }}>
              {view.statusLabel}
            </span>
          </p>
        )}
        {view.booking && (
          <p className="text-xs break-words" style={{ color: '#5c5c61' }}>
            Booked:{' '}
            <span className="font-medium" style={{ color: '#1d1d1f' }}>
              {describePinnedBooking(view.booking)}
            </span>
          </p>
        )}

        <p className="mt-2 text-sm break-words" style={{ color: '#0F3D73' }}>
          {view.reasonText}
        </p>

        {view.canViewLead && (
          <Link
            to={`/leads/${view.leadId}`}
            className="inline-flex items-center h-12 text-sm font-semibold hover:underline"
            style={{ color: '#0057B8' }}
          >
            View lead
          </Link>
        )}
      </div>
    </section>
  );
}

export default PinnedDeepLinkLead;
