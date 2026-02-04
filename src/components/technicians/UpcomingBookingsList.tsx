import { UpcomingJob } from '@/hooks/useTechnicianDetail';
import { UpcomingBookingCard } from './UpcomingBookingCard';

interface UpcomingBookingsListProps {
  bookings: UpcomingJob[];
  isLoading?: boolean;
}

function BookingCardSkeleton() {
  return (
    <div
      className="bg-white rounded-xl overflow-hidden animate-pulse"
      style={{ border: '1px solid #e5e5e5' }}
    >
      <div className="flex">
        <div className="w-1 bg-gray-200 shrink-0" />
        <div className="flex-1 p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-4 w-28 bg-gray-200 rounded" />
              <div className="h-5 w-16 bg-gray-200 rounded-full" />
            </div>
            <div className="h-4 w-36 bg-gray-200 rounded mb-1.5" />
            <div className="h-3 w-24 bg-gray-200 rounded" />
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="bg-white rounded-2xl p-8 text-center"
      style={{ border: '1px solid #e5e5e5' }}
    >
      <div
        className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)' }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '28px', color: '#007AFF' }}
        >
          event_available
        </span>
      </div>
      <h4 className="text-base font-semibold mb-1" style={{ color: '#1d1d1f' }}>
        No Upcoming Jobs
      </h4>
      <p className="text-sm max-w-xs mx-auto" style={{ color: '#617589' }}>
        No upcoming inspections or jobs are currently scheduled for this technician.
      </p>
    </div>
  );
}

export function UpcomingBookingsList({
  bookings,
  isLoading = false,
}: UpcomingBookingsListProps) {
  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold" style={{ color: '#1d1d1f' }}>
            Upcoming Jobs & Inspections
          </h3>
          <p className="text-xs mt-0.5" style={{ color: '#617589' }}>
            Sorted by date (closest first)
          </p>
        </div>
        {!isLoading && bookings.length > 0 && (
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ backgroundColor: '#f5f7f8', color: '#617589' }}
          >
            {bookings.length} upcoming
          </span>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <BookingCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && bookings.length === 0 && <EmptyState />}

      {/* Bookings List */}
      {!isLoading && bookings.length > 0 && (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <UpcomingBookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}

export default UpcomingBookingsList;
