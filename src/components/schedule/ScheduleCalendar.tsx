import { useNavigate } from 'react-router-dom';
import {
  CalendarEvent,
  getWeekDates,
  formatDayHeader,
  isToday,
  getEventsForDate,
  calculateEventPosition,
} from '@/hooks/useScheduleCalendar';
import { TIME_SLOTS } from '@/lib/bookingService';

// ============================================================================
// TYPES
// ============================================================================

interface ScheduleCalendarProps {
  weekStart: Date;
  events: CalendarEvent[];
  isLoading: boolean;
  onEventClick?: (event: CalendarEvent) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduleCalendar({
  weekStart,
  events,
  isLoading,
  onEventClick,
}: ScheduleCalendarProps) {
  const navigate = useNavigate();
  const weekDates = getWeekDates(weekStart);

  const handleEventClick = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event);
    } else if (event.leadId) {
      navigate(`/leads/${event.leadId}`);
    }
  };

  // Get event background color based on type and status
  const getEventStyles = (event: CalendarEvent) => {
    if (event.status === 'cancelled') {
      return {
        bg: 'rgba(239, 68, 68, 0.08)',
        border: '#ef4444',
        text: '#9ca3af',
        opacity: 0.5,
        strikethrough: true,
      };
    }
    if (event.status === 'completed') {
      return {
        bg: 'rgba(34, 197, 94, 0.1)',
        border: '#22c55e',
        text: '#15803d',
        opacity: 1,
        strikethrough: false,
      };
    }
    if (event.status === 'in_progress') {
      return {
        bg: 'rgba(234, 179, 8, 0.1)',
        border: '#eab308',
        text: '#a16207',
        opacity: 1,
        strikethrough: false,
      };
    }
    const isInspection = event.eventType === 'inspection';
    return {
      bg: isInspection ? 'rgba(19, 127, 236, 0.1)' : 'rgba(34, 197, 94, 0.1)',
      border: isInspection ? '#137fec' : '#22c55e',
      text: isInspection ? '#137fec' : '#15803d',
      opacity: 1,
      strikethrough: false,
    };
  };

  // Calculate duration label
  const getDurationLabel = (event: CalendarEvent): string => {
    const ms = event.endDatetime.getTime() - event.startDatetime.getTime();
    const hours = Math.max(ms / (1000 * 60 * 60), 0);
    if (hours <= 0) return '1h';
    if (hours === Math.floor(hours)) return `${hours}h`;
    return `${hours.toFixed(1)}h`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={{ color: '#86868b' }}>
            Loading schedule...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Time Column - Sticky */}
      <div
        className="w-14 flex-shrink-0 bg-white z-20"
        style={{ borderRight: '1px solid #e5e5e5' }}
      >
        {/* Spacer for day headers */}
        <div className="h-12" style={{ borderBottom: '1px solid #e5e5e5' }} />
        {/* Time labels */}
        <div className="flex flex-col">
          {TIME_SLOTS.map((slot) => (
            <div
              key={slot.time}
              className="h-16 text-[10px] font-medium text-center flex items-start justify-center pt-0.5"
              style={{ color: '#617589' }}
            >
              {slot.label.replace(':00 ', '')}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid - Scrollable */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Day Headers - Sticky */}
        <div
          className="sticky top-0 z-30 flex bg-white h-12 shadow-sm"
          style={{ borderBottom: '1px solid #e5e5e5' }}
        >
          {weekDates.map((date) => {
            const { dayName, dayNumber } = formatDayHeader(date);
            const isTodayDate = isToday(date);

            return (
              <div
                key={date.toISOString()}
                className={`flex-1 flex text-center items-center justify-center ${
                  isTodayDate ? 'bg-[#007AFF]/5' : ''
                }`}
                style={{ borderRight: '1px solid #e5e5e5' }}
              >
                <div>
                  <p
                    className={`text-[10px] font-medium uppercase ${
                      isTodayDate ? 'text-[#007AFF] font-bold' : ''
                    }`}
                    style={{ color: isTodayDate ? '#007AFF' : '#617589' }}
                  >
                    {dayName}
                  </p>
                  <p
                    className={`text-sm font-bold ${isTodayDate ? 'text-[#007AFF]' : ''}`}
                    style={{ color: isTodayDate ? '#007AFF' : '#1d1d1f' }}
                  >
                    {dayNumber}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Time Grid with Events */}
        <div
          className="relative grid grid-cols-7 divide-x"
          style={{
            minHeight: `${TIME_SLOTS.length * 64}px`, // 64px (h-16) per hour slot
            borderColor: '#e5e5e5',
          }}
        >
          {/* Hour Lines (background) */}
          <div className="absolute inset-0 pointer-events-none z-0 flex flex-col">
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot.time}
                className="h-16"
                style={{ borderBottom: '1px dashed #e5e5e5' }}
              />
            ))}
          </div>

          {/* Day Columns with Events */}
          {weekDates.map((date) => {
            const dayEvents = getEventsForDate(events, date);
            const isTodayDate = isToday(date);

            return (
              <div
                key={date.toISOString()}
                className={`relative h-full z-10 group transition-colors ${
                  isTodayDate ? 'bg-[#007AFF]/5' : 'hover:bg-gray-50/50'
                }`}
              >
                {dayEvents.map((event) => {
                  const { top, height } = calculateEventPosition(event);
                  const styles = getEventStyles(event);
                  const location = [event.suburb, event.postcode].filter(Boolean).join(' ');
                  const duration = getDurationLabel(event);

                  return (
                    <div
                      key={event.id}
                      className="absolute left-0.5 right-0.5 rounded-lg shadow-sm p-2 flex flex-col gap-0.5 cursor-pointer hover:brightness-95 transition-all overflow-hidden"
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        backgroundColor: styles.bg,
                        borderLeft: `3px solid ${styles.border}`,
                        opacity: styles.opacity,
                      }}
                      onClick={() => handleEventClick(event)}
                    >
                      {/* Time + Duration and Technician Badge */}
                      <div className="flex justify-between items-start gap-1">
                        <span
                          className="text-[11px] font-bold"
                          style={{ color: styles.text }}
                        >
                          {event.startDatetime.toLocaleTimeString('en-AU', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          }).toLowerCase()}
                          <span className="font-medium opacity-75 ml-0.5">({duration})</span>
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Status icon */}
                          {event.status === 'completed' && (
                            <span className="material-symbols-outlined text-green-600" style={{ fontSize: '14px' }}>check_circle</span>
                          )}
                          {event.status === 'in_progress' && (
                            <span className="material-symbols-outlined text-yellow-600" style={{ fontSize: '14px' }}>pending</span>
                          )}
                          {event.status === 'cancelled' && (
                            <span className="material-symbols-outlined text-red-400" style={{ fontSize: '14px' }}>cancel</span>
                          )}
                          <span
                            className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold"
                            style={{
                              backgroundColor: event.technicianColor,
                              color: 'white',
                            }}
                          >
                            {event.technicianInitial}
                          </span>
                        </div>
                      </div>

                      {/* Client Name */}
                      <p
                        className="text-[11px] font-bold leading-tight"
                        style={{
                          color: styles.text,
                          textDecoration: styles.strikethrough ? 'line-through' : undefined,
                        }}
                      >
                        {event.clientName}
                      </p>

                      {/* Suburb + Postcode */}
                      {location && (
                        <p
                          className="text-[10px] font-medium"
                          style={{ color: '#617589' }}
                        >
                          {location}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ScheduleCalendar;
