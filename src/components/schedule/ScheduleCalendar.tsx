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
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduleCalendar({
  weekStart,
  events,
  isLoading,
}: ScheduleCalendarProps) {
  const navigate = useNavigate();
  const weekDates = getWeekDates(weekStart);

  const handleEventClick = (event: CalendarEvent) => {
    if (event.leadId) {
      navigate(`/leads/${event.leadId}`);
    }
  };

  // Get event background color based on type
  const getEventStyles = (event: CalendarEvent) => {
    const isInspection = event.eventType === 'inspection';
    return {
      bg: isInspection ? 'rgba(19, 127, 236, 0.1)' : 'rgba(34, 197, 94, 0.1)',
      border: isInspection ? '#137fec' : '#22c55e',
      text: isInspection ? '#137fec' : '#15803d',
    };
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
                  // Format suburb + postcode
                  const location = [event.suburb, event.postcode].filter(Boolean).join(' ');

                  return (
                    <div
                      key={event.id}
                      className="absolute left-0.5 right-0.5 rounded-lg shadow-sm p-2 flex flex-col gap-0.5 cursor-pointer hover:brightness-95 transition-all overflow-hidden"
                      style={{
                        top: `${top}%`,
                        height: `${height}%`, // Height already has minimum in calculateEventPosition
                        backgroundColor: styles.bg,
                        borderLeft: `3px solid ${styles.border}`,
                      }}
                      onClick={() => handleEventClick(event)}
                    >
                      {/* Time and Technician Badge */}
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
                        </span>
                        <span
                          className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0"
                          style={{
                            backgroundColor: event.technicianColor,
                            color: 'white',
                          }}
                        >
                          {event.technicianInitial}
                        </span>
                      </div>

                      {/* Client Name - full name, no truncation */}
                      <p
                        className="text-[11px] font-bold leading-tight"
                        style={{ color: styles.text }}
                      >
                        {event.clientName}
                      </p>

                      {/* Suburb + Postcode - always show if available */}
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
