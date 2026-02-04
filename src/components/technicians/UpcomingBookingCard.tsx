import { useNavigate } from 'react-router-dom';
import { UpcomingJob, formatJobDateTime, getEventTypeColor, getJobAccentColor } from '@/hooks/useTechnicianDetail';

interface UpcomingBookingCardProps {
  booking: UpcomingJob;
}

export function UpcomingBookingCard({ booking }: UpcomingBookingCardProps) {
  const navigate = useNavigate();
  const typeColors = getEventTypeColor(booking.eventType);
  const accentColor = getJobAccentColor(booking.eventType);

  const handleCardClick = () => {
    if (booking.leadId) {
      navigate(`/leads/${booking.leadId}`);
    }
  };

  const handleCallClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-xl overflow-hidden transition-all hover:shadow-md ${
        booking.leadId ? 'cursor-pointer' : ''
      }`}
      style={{ border: '1px solid #e5e5e5' }}
    >
      <div className="flex">
        {/* Coloured Left Border */}
        <div className={`w-1 shrink-0 ${accentColor}`} />

        {/* Content */}
        <div className="flex-1 p-4 flex items-center gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Date/Time and Type Badge Row */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span
                className="text-sm font-semibold"
                style={{ color: '#1d1d1f' }}
              >
                {formatJobDateTime(booking.startDatetime)}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors.bg} ${typeColors.text}`}
              >
                {booking.eventType === 'inspection' ? 'Inspection' : 'Job'}
              </span>
            </div>

            {/* Customer Name */}
            <p
              className="text-sm font-medium truncate"
              style={{ color: '#1d1d1f' }}
            >
              {booking.customerName}
            </p>

            {/* Location */}
            {booking.suburb && (
              <div className="flex items-center gap-1 mt-1">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '14px', color: '#617589' }}
                >
                  location_on
                </span>
                <span className="text-xs" style={{ color: '#617589' }}>
                  {booking.suburb}
                </span>
              </div>
            )}
          </div>

          {/* Call Button */}
          {booking.phone && (
            <a
              href={`tel:${booking.phone}`}
              onClick={handleCallClick}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors"
              style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(52, 199, 89, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(52, 199, 89, 0.1)';
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '20px', color: '#34C759' }}
              >
                call
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpcomingBookingCard;
