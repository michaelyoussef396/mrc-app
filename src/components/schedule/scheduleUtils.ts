import type { CalendarEvent } from '@/hooks/useScheduleCalendar';

/**
 * Get event background color, border, text color based on type and status.
 * Shared between ScheduleCalendar (weekly grid) and ScheduleDailyView (mobile cards).
 */
export function getEventStyles(event: CalendarEvent) {
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
}

/**
 * Calculate human-readable duration label from event start/end times.
 */
export function getDurationLabel(event: CalendarEvent): string {
  const ms = event.endDatetime.getTime() - event.startDatetime.getTime();
  const hours = Math.max(ms / (1000 * 60 * 60), 0);
  if (hours <= 0) return '1h';
  if (hours === Math.floor(hours)) return `${hours}h`;
  return `${hours.toFixed(1)}h`;
}
