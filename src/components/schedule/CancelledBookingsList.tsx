import type { CalendarEvent } from '@/hooks/useScheduleCalendar';

// ============================================================================
// TYPES
// ============================================================================

interface CancelledBookingsListProps {
  events: CalendarEvent[];
  isLoading: boolean;
  onEventClick: (event: CalendarEvent) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CancelledBookingsList({ events, isLoading, onEventClick }: CancelledBookingsListProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-xl bg-gray-50">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span
          className="material-symbols-outlined text-5xl mb-3"
          style={{ color: '#c7c7cc' }}
        >
          event_busy
        </span>
        <p className="text-base font-semibold" style={{ color: '#86868b' }}>
          No cancelled bookings
        </p>
        <p className="text-sm mt-1" style={{ color: '#aeaeb2' }}>
          Cancelled bookings will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide px-1 mb-3" style={{ color: '#86868b' }}>
        {events.length} cancelled booking{events.length !== 1 ? 's' : ''}
      </p>

      {events.map((event) => {
        const dateStr = event.startDatetime.toLocaleDateString('en-AU', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        const timeStr = event.startDatetime.toLocaleTimeString('en-AU', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });

        return (
          <button
            key={event.id}
            onClick={() => onEventClick(event)}
            className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left"
            style={{ minHeight: '48px', borderBottom: '1px solid #f0f0f0' }}
          >
            {/* Technician avatar */}
            <span
              className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: event.technicianColor }}
            >
              {event.technicianInitial}
            </span>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {event.clientName}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {event.suburb}{event.postcode ? ` ${event.postcode}` : ''} &middot; {event.technicianName}
              </p>
            </div>

            {/* Date / time */}
            <div className="flex-shrink-0 text-right">
              <p className="text-xs font-medium text-slate-500">{dateStr}</p>
              <p className="text-xs text-slate-400">{timeStr}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default CancelledBookingsList;
