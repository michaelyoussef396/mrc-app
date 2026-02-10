import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  leadId?: string;
  inspectionId?: string;
  templateName?: string;
}

interface SendSlackNotificationParams {
  event: 'new_lead' | 'inspection_booked' | 'report_ready' | 'report_approved';
  leadId?: string;
  leadName?: string;
  propertyAddress?: string;
  technicianName?: string;
  bookingDate?: string;
  additionalInfo?: Record<string, string>;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Send an email via the `send-email` Supabase Edge Function.
 * Fire-and-forget — failures are logged, never thrown.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: params,
    });

    if (error) {
      console.error('[Notifications] Email edge function error:', error);
      return;
    }

    if (data && !data.success) {
      console.error('[Notifications] Email send failed:', data.error);
      return;
    }

    console.log('[Notifications] Email sent to', params.to);
  } catch (err) {
    console.error('[Notifications] Email send error:', err);
  }
}

/**
 * Send a Slack notification via the `send-slack-notification` Supabase Edge Function.
 * Fire-and-forget — failures are logged, never thrown.
 */
export async function sendSlackNotification(params: SendSlackNotificationParams): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-slack-notification', {
      body: params,
    });

    if (error) {
      console.error('[Notifications] Slack edge function error:', error);
      return;
    }

    if (data && !data.success) {
      console.error('[Notifications] Slack notification failed:', data.error);
      return;
    }

    console.log('[Notifications] Slack notification sent:', params.event);
  } catch (err) {
    console.error('[Notifications] Slack notification error:', err);
  }
}
