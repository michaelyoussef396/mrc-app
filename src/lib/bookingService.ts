import { supabase } from '@/integrations/supabase/client';
import { QueryClient } from '@tanstack/react-query';
import { sendEmail, sendSlackNotification, buildBookingConfirmationHtml } from '@/lib/api/notifications';
import { captureBusinessError, addBusinessBreadcrumb } from '@/lib/sentry';
import { formatMediumDateAU } from '@/lib/dateUtils';
import { appendInternalNote } from '@/lib/utils/internalNotes';

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
  /** Display name of the admin doing the booking. Stamped on the
   *  internal_notes log entry alongside the (booking call) attribution.
   *  Caller resolves via profile.full_name → user.email → 'Unknown user'. */
  authorName?: string;
  technicianName?: string;
  durationMinutes?: number;    // Default 60
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
 * Book an inspection - creates calendar booking, updates lead, logs activity.
 * Used by LeadBookingCard in the Schedule sidebar.
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
    authorName,
    technicianName,
    durationMinutes = 60,
  } = params;


  try {
    addBusinessBreadcrumb('Booking inspection', { leadId, technicianId, inspectionDate, inspectionTime });

    // Combine date and time
    const startDateTime = new Date(`${inspectionDate}T${inspectionTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

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


    // 2. Update lead with booking info.
    // internal_notes is APPEND-ONLY here — fetch the current log, prepend the new
    // (booking call) entry. If no booking-time note was supplied, the column is
    // not touched at all (existing log preserved).
    const leadUpdate: Record<string, unknown> = {
      status: 'inspection_waiting',
      inspection_scheduled_date: inspectionDate,
      scheduled_time: inspectionTime,
      assigned_to: technicianId,
    };

    if (internalNotes && internalNotes.trim()) {
      const { data: currentLead } = await supabase
        .from('leads')
        .select('internal_notes')
        .eq('id', leadId)
        .single();

      leadUpdate.internal_notes = appendInternalNote(
        currentLead?.internal_notes ?? null,
        internalNotes,
        { authorName: authorName || 'Unknown user', context: 'booking call' },
      );
    }

    const { error: leadError } = await supabase
      .from('leads')
      .update(leadUpdate)
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
      description: `Scheduled to ${technicianName || 'technician'} for ${formatDateForDisplay(inspectionDate)} at ${formatTimeForDisplay(inspectionTime)}`,
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

    // Email booking confirmation to customer (async, non-blocking).
    // The booking is already committed; email failures must not roll it back,
    // but they MUST surface — past behaviour swallowed errors silently and
    // skipped null-email leads with no record. Now: every booking emits a
    // signal — sent (email_logs row from Edge Function), failed (Sentry +
    // email_logs row from Edge Function), or skipped (email_logs row written
    // here so admins always have a paper trail).
    void sendBookingConfirmationEmail({
      leadId,
      customerName,
      displayDate,
      displayTime,
      propertyAddress,
    });

    return {
      success: true,
      bookingId: bookingData.id,
    };
  } catch (error) {
    captureBusinessError('Booking failed', {
      leadId,
      technicianId,
      inspectionDate,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface SendBookingConfirmationParams {
  leadId: string;
  customerName: string;
  displayDate: string;
  displayTime: string;
  propertyAddress: string;
}

/**
 * Resolve the lead's email and dispatch the booking confirmation. Errors
 * surface to Sentry; null-email leads write a 'failed' row to email_logs so
 * admins always have a delivery record (skip + reason).
 *
 * Called as fire-and-forget from bookInspection() — the booking is already
 * committed, the email path must not roll it back, but it must not fail
 * silently either (the floating .then() pattern that came before).
 */
async function sendBookingConfirmationEmail(
  params: SendBookingConfirmationParams,
): Promise<void> {
  const { leadId, customerName, displayDate, displayTime, propertyAddress } = params;
  try {
    const { data: leadData, error: fetchError } = await supabase
      .from('leads')
      .select('email')
      .eq('id', leadId)
      .single();

    if (fetchError) throw fetchError;

    if (!leadData?.email) {
      // Lead has no email on file — record the skip so the absence is auditable.
      addBusinessBreadcrumb('Booking email skipped — no email on file', { leadId });
      await supabase.from('email_logs').insert({
        recipient_email: null,
        subject: `Inspection Booking Confirmed — ${displayDate}`,
        template_name: 'booking-confirmation',
        status: 'failed',
        provider: 'resend',
        error_message: 'No email address on file',
        lead_id: leadId,
        sent_at: new Date().toISOString(),
      });
      return;
    }

    await sendEmail({
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
  } catch (error) {
    captureBusinessError('Booking confirmation email failed', {
      leadId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Format date from YYYY-MM-DD to "15 Jan 2024"
 */
export function formatDateForDisplay(dateStr: string): string {
  return formatMediumDateAU(dateStr);
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
