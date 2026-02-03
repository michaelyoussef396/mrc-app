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
    <div className="flex flex-1 overflow-hidden relative">
      {/* Time Column */}
      <div
        className="w-14 flex-none bg-white z-20 flex flex-col pt-12 overflow-hidden"
        style={{ borderRight: '1px solid #e5e5e5' }}
      >
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 flex flex-col">
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot.time}
                className="h-20 text-[10px] font-medium text-center relative -top-2"
                style={{ color: '#617589' }}
              >
                {slot.label.replace(':00 ', ' ')}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
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
          className="relative flex-1 grid grid-cols-7 divide-x"
          style={{
            minHeight: `${TIME_SLOTS.length * 80}px`, // 80px per hour slot
            borderColor: '#e5e5e5',
          }}
        >
          {/* Hour Lines (background) */}
          <div className="absolute inset-0 pointer-events-none z-0 flex flex-col">
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot.time}
                className="h-20 border-dashed"
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

                  return (
                    <div
                      key={event.id}
                      className="absolute left-1 right-1 rounded shadow-sm p-1.5 flex flex-col gap-0.5 cursor-pointer hover:brightness-95 transition-all"
                      style={{
                        top: `${top}%`,
                        height: `${Math.max(height, 6)}%`, // Minimum 6% height for visibility
                        backgroundColor: styles.bg,
                        borderLeft: `4px solid ${styles.border}`,
                      }}
                      onClick={() => handleEventClick(event)}
                    >
                      {/* Time and Technician Badge */}
                      <div className="flex justify-between items-start">
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: styles.text }}
                        >
                          {event.startDatetime.toLocaleTimeString('en-AU', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </span>
                        <span
                          className="w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold"
                          style={{
                            backgroundColor: event.technicianColor,
                            color: 'white',
                          }}
                        >
                          {event.technicianInitial}
                        </span>
                      </div>

                      {/* Client Name */}
                      <p
                        className="text-xs font-bold leading-tight line-clamp-2"
                        style={{ color: styles.text }}
                      >
                        {event.eventType === 'inspection' ? 'Insp: ' : ''}
                        {event.clientName}
                      </p>

                      {/* Suburb */}
                      {height > 10 && event.suburb && (
                        <p
                          className="text-[10px] line-clamp-1"
                          style={{ color: '#86868b' }}
                        >
                          {event.suburb}
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
