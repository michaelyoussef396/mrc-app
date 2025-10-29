import { supabase } from '@/integrations/supabase/client';

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
    // Get all active technicians
    const { data: technicians, error: techError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('is_active', true);

    if (techError) throw techError;

    if (!technicians || technicians.length === 0) {
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

    // TODO: Send email notifications
    // This would require setting up an edge function with Resend
    
    // TODO: Send SMS notifications (optional)
    // This would require setting up an edge function with Twilio or similar

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

    if (type === 'job-started') {
      // TODO: Implement SMS notification
      console.log(`Sending job started notification to ${lead.full_name}`);
      
      // TODO: Send email notification via edge function
      // await sendEmail({
      //   to: lead.email,
      //   subject: 'Your Mould Remediation Service Has Started',
      //   template: 'job-started-client',
      //   data: {
      //     clientName: lead.full_name,
      //     property: lead.property_address_street,
      //   }
      // });
    }
  } catch (error) {
    console.error('Error sending client notification:', error);
  }
};
