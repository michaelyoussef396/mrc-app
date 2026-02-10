import { supabase } from '@/integrations/supabase/client';
import { QueryClient } from '@tanstack/react-query';
import { sendEmail, sendSlackNotification, buildBookingConfirmationHtml } from '@/lib/api/notifications';

// ============================================================================
// TYPES
// ============================================================================

export interface BookInspectionParams {
  leadId: string;
  customerName: string;
  propertyAddress: string;
  inspectionDate: string;      // YYYY-MM-DD
  inspectionTime: string;      // HH:MM (24hr)
  technicianId: string;
  internalNotes?: string;
}

export interface BookInspectionResult {
  success: boolean;
  error?: string;
  bookingId?: string;
}

// ============================================================================
// BOOKING SERVICE
// ============================================================================

/**
 * Check for booking conflicts - prevents double-booking a technician
 */
export async function checkBookingConflict(
  technicianId: string,
  startDatetime: Date,
  endDatetime: Date
): Promise<{ hasConflict: boolean; conflictDetails?: string }> {
  const { data, error } = await supabase
    .from('calendar_bookings')
    .select('id, title, start_datetime, end_datetime')
    .eq('assigned_to', technicianId)
    .neq('status', 'cancelled')
    .lt('start_datetime', endDatetime.toISOString())
    .gt('end_datetime', startDatetime.toISOString());

  if (error) {
    console.error('[BookingService] Conflict check error:', error);
    return { hasConflict: false };
  }

  if (data && data.length > 0) {
    const conflict = data[0];
    const conflictStart = new Date(conflict.start_datetime);
    const time = conflictStart.toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return {
      hasConflict: true,
      conflictDetails: `Already booked at ${time} (${conflict.title})`,
    };
  }

  return { hasConflict: false };
}

/**
 * Book an inspection - creates calendar booking, updates lead, logs activity
 * Extracted from BookInspectionModal for reuse across the app
 */
export async function bookInspection(
  params: BookInspectionParams,
  queryClient: QueryClient
): Promise<BookInspectionResult> {
  const {
    leadId,
    customerName,
    propertyAddress,
    inspectionDate,
    inspectionTime,
    technicianId,
    internalNotes,
  } = params;

  console.log('[BookingService] bookInspection called with:', {
    leadId,
    customerName,
    inspectionDate,
    inspectionTime,
    technicianId,
    hasInternalNotes: !!internalNotes,
  });

  try {
    // Combine date and time - Fixed 1 hour duration
    const startDateTime = new Date(`${inspectionDate}T${inspectionTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Always 1 hour

    // 0. Check for booking conflicts
    const { hasConflict, conflictDetails } = await checkBookingConflict(
      technicianId,
      startDateTime,
      endDateTime
    );
    if (hasConflict) {
      return {
        success: false,
        error: `Technician already booked at this time. ${conflictDetails}`,
      };
    }

    console.log('[BookingService] Creating calendar booking...', {
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
    });

    // 1. Create calendar booking
    const { data: bookingData, error: calendarError } = await supabase
      .from('calendar_bookings')
      .insert({
        lead_id: leadId,
        event_type: 'inspection',
        title: `Inspection - ${customerName}`,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        location_address: propertyAddress,
        assigned_to: technicianId,
        status: 'scheduled',
        description: internalNotes || null,
      })
      .select('id')
      .single();

    if (calendarError) {
      console.error('[BookingService] Calendar booking error:', calendarError);
      throw new Error(`Failed to create calendar booking: ${calendarError.message}`);
    }

    console.log('[BookingService] Calendar booking created:', bookingData.id);

    // 2. Update lead with booking info
    console.log('[BookingService] Updating lead status...');
    const { error: leadError } = await supabase
      .from('leads')
      .update({
        status: 'inspection_waiting',
        inspection_scheduled_date: inspectionDate,
        scheduled_time: inspectionTime,
        assigned_to: technicianId,
      })
      .eq('id', leadId);

    if (leadError) {
      console.error('[BookingService] Lead update error:', leadError);
      // Attempt to rollback calendar booking
      await supabase.from('calendar_bookings').delete().eq('id', bookingData.id);
      throw new Error(`Failed to update lead: ${leadError.message}`);
    }

    // 3. Create activity log entry
    const { error: activityError } = await supabase.from('activities').insert({
      lead_id: leadId,
      activity_type: 'inspection_booked',
      title: 'Inspection Booked',
      description: `Inspection scheduled for ${formatDateForDisplay(inspectionDate)} at ${formatTimeForDisplay(inspectionTime)}`,
    });

    if (activityError) {
      // Non-critical - log but don't fail
      console.warn('[BookingService] Activity log error:', activityError);
    }

    // 4. Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    queryClient.invalidateQueries({ queryKey: ['schedule-calendar'] });
    queryClient.invalidateQueries({ queryKey: ['unscheduled-leads'] });
    queryClient.invalidateQueries({ queryKey: ['leads-to-schedule'] });

    // 5. Fire-and-forget notifications
    const displayDate = formatDateForDisplay(inspectionDate);
    const displayTime = formatTimeForDisplay(inspectionTime);

    sendSlackNotification({
      event: 'inspection_booked',
      leadId,
      leadName: customerName,
      propertyAddress,
      bookingDate: `${displayDate} at ${displayTime}`,
    });

    // Email booking confirmation to customer
    supabase
      .from('leads')
      .select('email')
      .eq('id', leadId)
      .single()
      .then(({ data: leadData }) => {
        if (leadData?.email) {
          sendEmail({
            to: leadData.email,
            subject: `Inspection Booking Confirmed — ${displayDate}`,
            html: buildBookingConfirmationHtml({
              customerName,
              date: displayDate,
              time: displayTime,
              address: propertyAddress,
            }),
            leadId,
            templateName: 'booking-confirmation',
          });
        }
      });

    return {
      success: true,
      bookingId: bookingData.id,
    };
  } catch (error) {
    console.error('[BookingService] Booking failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date from YYYY-MM-DD to "15 Jan 2024"
 */
export function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format time from HH:MM to "9:00 AM"
 */
export function formatTimeForDisplay(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get time ago string from date
 */
export function getTimeAgo(dateString: string): string {
  if (!dateString) return '';

  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  }
}

/**
 * Hourly time slots from 7AM to 7PM
 */
export const TIME_SLOTS = [
  { time: '07:00', label: '7:00 AM' },
  { time: '08:00', label: '8:00 AM' },
  { time: '09:00', label: '9:00 AM' },
  { time: '10:00', label: '10:00 AM' },
  { time: '11:00', label: '11:00 AM' },
  { time: '12:00', label: '12:00 PM' },
  { time: '13:00', label: '1:00 PM' },
  { time: '14:00', label: '2:00 PM' },
  { time: '15:00', label: '3:00 PM' },
  { time: '16:00', label: '4:00 PM' },
  { time: '17:00', label: '5:00 PM' },
  { time: '18:00', label: '6:00 PM' },
  { time: '19:00', label: '7:00 PM' },
];

/**
 * Technician definitions
 */
export const TECHNICIANS = [
  { id: 'clayton', name: 'Clayton', initials: 'C', color: '#007AFF' },
  { id: 'glen', name: 'Glen', initials: 'G', color: '#34C759' },
];

/**
 * Get technician color by name
 */
export function getTechnicianColor(name: string): string {
  if (name?.toLowerCase().includes('clayton')) return '#007AFF';
  if (name?.toLowerCase().includes('glen')) return '#34C759';
  return '#86868b';
}

/**
 * Get technician initial by name
 */
export function getTechnicianInitial(name: string): string {
  if (name?.toLowerCase().includes('clayton')) return 'C';
  if (name?.toLowerCase().includes('glen')) return 'G';
  return name?.[0]?.toUpperCase() || '?';
}
