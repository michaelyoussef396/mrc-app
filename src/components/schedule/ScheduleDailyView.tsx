import { CalendarEvent, getEventsForDate, isToday } from '@/hooks/useScheduleCalendar';
import { getEventStyles, getDurationLabel } from './scheduleUtils';
import { CalendarCheck, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface ScheduleDailyViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  isLoading: boolean;
  onEventClick?: (event: CalendarEvent) => void;
}

export function ScheduleDailyView({
  selectedDate,
  events,
  isLoading,
  onEventClick,
}: ScheduleDailyViewProps) {
  const dayEvents = getEventsForDate(events, selectedDate)
    .slice()
    .sort((a, b) => a.startDatetime.getTime() - b.startDatetime.getTime());

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse flex items-center gap-3 rounded-xl p-4"
            style={{ backgroundColor: '#f0f2f4', minHeight: '64px' }}
          >
            <div className="w-14 h-8 rounded bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
            <div className="w-7 h-7 rounded-full bg-gray-200" />
          </div>
        ))}
      </div>
    );
  }

  if (dayEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <CalendarCheck className="h-12 w-12 mb-3" style={{ color: '#c7c7cc' }} />
        <p className="text-base font-semibold" style={{ color: '#86868b' }}>
          No bookings
        </p>
        <p className="text-sm mt-1" style={{ color: '#aeaeb2' }}>
          {isToday(selectedDate)
            ? 'Nothing scheduled for today'
            : 'Nothing scheduled for this day'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {dayEvents.map((event) => (
        <DailyEventCard
          key={event.id}
          event={event}
          onClick={() => onEventClick?.(event)}
        />
      ))}
    </div>
  );
}

function DailyEventCard({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const styles = getEventStyles(event);
  const duration = getDurationLabel(event);
  const location = [event.suburb, event.postcode].filter(Boolean).join(' ');

  const startTime = event.startDatetime
    .toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase();

  return (
    <button
      onClick={onClick}
      className="w-full flex items-stretch rounded-xl overflow-hidden shadow-sm hover:brightness-95 transition-all text-left"
      style={{
        backgroundColor: styles.bg,
        border: `1px solid ${styles.border}`,
        minHeight: '64px',
        opacity: styles.opacity,
      }}
    >
      {/* Left accent bar */}
      <div
        className="w-1 flex-shrink-0"
        style={{ backgroundColor: styles.border }}
      />

      {/* Content */}
      <div className="flex-1 flex items-center gap-3 px-3 py-3">
        {/* Time block */}
        <div className="flex-shrink-0 w-14 text-right">
          <p className="text-xs font-bold" style={{ color: styles.text }}>
            {startTime}
          </p>
          <p className="text-[10px] font-medium" style={{ color: '#86868b' }}>
            {duration}
          </p>
        </div>

        {/* Divider */}
        <div
          className="w-px self-stretch"
          style={{ backgroundColor: styles.border, opacity: 0.3 }}
        />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-bold leading-tight truncate"
            style={{
              color: styles.text,
              textDecoration: styles.strikethrough ? 'line-through' : undefined,
            }}
          >
            {event.clientName}
          </p>
          {location && (
            <p className="text-xs mt-0.5 truncate" style={{ color: '#617589' }}>
              {location}
            </p>
          )}
          <p
            className="text-[10px] font-semibold uppercase tracking-wide mt-0.5"
            style={{ color: styles.text, opacity: 0.7 }}
          >
            {event.eventType}
          </p>
        </div>

        {/* Right: status icon + tech badge */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {event.status === 'completed' && (
            <CheckCircle2 className="h-[18px] w-[18px] text-green-600" />
          )}
          {event.status === 'in_progress' && (
            <Clock className="h-[18px] w-[18px] text-yellow-600" />
          )}
          {event.status === 'cancelled' && (
            <XCircle className="h-[18px] w-[18px] text-red-400" />
          )}
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
            style={{ backgroundColor: event.technicianColor }}
          >
            {event.technicianInitial}
          </span>
        </div>
      </div>
    </button>
  );
}

export default ScheduleDailyView;
