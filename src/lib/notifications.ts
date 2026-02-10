import { supabase } from '@/integrations/supabase/client';
import { sendEmail } from '@/lib/api/notifications';

export interface NotificationData {
  leadId: string;
  clientName: string;
  selectedDates: string[];
  selectedTimeSlot: string;
  property: string;
  suburb: string;
  quoteAmount: number;
}

export const sendTechnicianNotifications = async (bookingData: NotificationData) => {
  try {
    // Get all users from Edge Function (uses auth.users + user_metadata)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('No session found, cannot fetch users');
      return;
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const { users } = await response.json();

    // Filter to only active users (all users shown, but only notify active ones)
    const technicians = users?.filter((user: { is_active: boolean }) => user.is_active !== false) || [];

    if (technicians.length === 0) {
      console.warn('No active technicians found');
      return;
    }

    // Create in-app notifications for all technicians
    const notifications = technicians.map(tech => ({
      user_id: tech.id,
      type: 'job-booked',
      title: 'New Job Booked! 🎉',
      message: `${bookingData.clientName} booked service for ${bookingData.selectedDates[0]} at ${bookingData.selectedTimeSlot}`,
      action_url: `/client/${bookingData.leadId}`,
      priority: 'high'
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) throw notifError;

    console.log(`Sent notifications to ${technicians.length} technicians`);

    // Send email notifications to technicians (fire-and-forget)
    for (const tech of technicians) {
      if (tech.email) {
        sendEmail({
          to: tech.email,
          subject: `New Job Booked — ${bookingData.clientName}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #1d1d1f;">New Job Booked</h2>
              <p><strong>Client:</strong> ${bookingData.clientName}</p>
              <p><strong>Date:</strong> ${bookingData.selectedDates[0]}</p>
              <p><strong>Time:</strong> ${bookingData.selectedTimeSlot}</p>
              <p><strong>Property:</strong> ${bookingData.property}, ${bookingData.suburb}</p>
              <p><strong>Quote:</strong> $${bookingData.quoteAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
              <p style="color: #86868b; font-size: 12px;">Mould &amp; Restoration Co — Automated Notification</p>
            </div>
          `,
          leadId: bookingData.leadId,
          templateName: 'job-booked-technician',
        });
      }
    }

  } catch (error) {
    console.error('Error sending technician notifications:', error);
    throw error;
  }
};

export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  actionUrl?: string,
  priority: 'normal' | 'high' = 'normal'
) => {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      action_url: actionUrl,
      priority
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

export const generateBookingToken = async (leadId: string): Promise<string> => {
  try {
    // Generate a secure random token
    const token = crypto.randomUUID() + '-' + Date.now();
    
    // Set expiration to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data, error } = await supabase
      .from('booking_tokens')
      .insert({
        lead_id: leadId,
        token,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return token;
  } catch (error) {
    console.error('Error generating booking token:', error);
    throw error;
  }
};

export const sendClientNotification = async (leadId: string, type: 'job-started' | 'job-completed') => {
  try {
    // Load client details
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!lead) return;

    if (type === 'job-started' && lead.email) {
      sendEmail({
        to: lead.email,
        subject: 'Your Mould Remediation Service Has Started',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1d1d1f;">Service Has Started</h2>
            <p>Hi ${lead.full_name},</p>
            <p>We're writing to let you know that our technician has arrived at <strong>${lead.property_address_street}</strong> and has started the mould remediation service.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
            <p style="color: #86868b; font-size: 12px;">Mould &amp; Restoration Co<br>Melbourne, VIC</p>
          </div>
        `,
        leadId,
        templateName: 'job-started-client',
      });
    } else if (type === 'job-completed' && lead.email) {
      sendEmail({
        to: lead.email,
        subject: 'Your Mould Remediation Service is Complete',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1d1d1f;">Service Complete</h2>
            <p>Hi ${lead.full_name},</p>
            <p>The mould remediation service at <strong>${lead.property_address_street}</strong> has been completed. You will receive your inspection report shortly.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
            <p style="color: #86868b; font-size: 12px;">Mould &amp; Restoration Co<br>Melbourne, VIC</p>
          </div>
        `,
        leadId,
        templateName: 'job-completed-client',
      });
    }
  } catch (error) {
    console.error('Error sending client notification:', error);
  }
};
