import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TimelineEvent {
  id: string;
  source: 'activity' | 'email' | 'notification';
  type: string;
  iconName: string;
  iconColor: string;
  title: string;
  description: string | null;
  leadId: string | null;
  leadName: string | null;
  leadNumber: string | null;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Map activity types to icon info
function getActivityIcon(type: string): { iconName: string; iconColor: string } {
  switch (type) {
    case 'lead_created':
      return { iconName: 'UserPlus', iconColor: 'text-blue-600 bg-blue-100' };
    case 'status_changed':
    case 'status_change':
      return { iconName: 'ArrowRight', iconColor: 'text-purple-600 bg-purple-100' };
    case 'inspection_booked':
      return { iconName: 'Calendar', iconColor: 'text-orange-600 bg-orange-100' };
    case 'email_sent':
      return { iconName: 'Mail', iconColor: 'text-green-600 bg-green-100' };
    case 'booking_cancelled':
      return { iconName: 'XCircle', iconColor: 'text-red-600 bg-red-100' };
    case 'archived':
      return { iconName: 'Archive', iconColor: 'text-gray-600 bg-gray-100' };
    default:
      return { iconName: 'Activity', iconColor: 'text-gray-600 bg-gray-100' };
  }
}

function getEmailIcon(status: string | null): { iconName: string; iconColor: string } {
  switch (status) {
    case 'bounced':
      return { iconName: 'MailX', iconColor: 'text-red-600 bg-red-100' };
    case 'delivered':
      return { iconName: 'MailCheck', iconColor: 'text-teal-600 bg-teal-100' };
    default:
      return { iconName: 'MailCheck', iconColor: 'text-teal-600 bg-teal-100' };
  }
}

function getNotificationIcon(): { iconName: string; iconColor: string } {
  return { iconName: 'Bell', iconColor: 'text-blue-600 bg-blue-100' };
}

// Friendly template name mapping
function formatTemplateName(templateName: string | null): string {
  if (!templateName) return 'Email';
  const map: Record<string, string> = {
    'inspection-report': 'Inspection Report',
    'booking-confirmation': 'Booking Confirmation',
    'customer-reminder': 'Customer Reminder',
    'custom-email': 'Custom Email',
  };
  return map[templateName] || templateName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function useActivityTimeline(limit: number = 15, leadId?: string) {
  return useQuery({
    queryKey: ['activity-timeline', limit, leadId || 'global'],
    queryFn: async (): Promise<TimelineEvent[]> => {
      // Build queries in parallel
      let activitiesQuery = supabase
        .from('activities')
        .select('id, activity_type, title, description, metadata, created_at, lead_id, leads(full_name, lead_number)')
        .order('created_at', { ascending: false })
        .limit(limit);

      let emailsQuery = supabase
        .from('email_logs')
        .select('id, recipient_email, subject, template_name, status, sent_at, lead_id, leads(full_name, lead_number)')
        .order('sent_at', { ascending: false })
        .limit(limit);

      let notificationsQuery = supabase
        .from('notifications')
        .select('id, type, title, message, created_at, lead_id, leads(full_name, lead_number)')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Filter by lead if provided
      if (leadId) {
        activitiesQuery = activitiesQuery.eq('lead_id', leadId);
        emailsQuery = emailsQuery.eq('lead_id', leadId);
        notificationsQuery = notificationsQuery.eq('lead_id', leadId);
      }

      const [activitiesRes, emailsRes, notificationsRes] = await Promise.all([
        activitiesQuery,
        emailsQuery,
        notificationsQuery,
      ]);

      const events: TimelineEvent[] = [];

      // Map activities
      if (activitiesRes.data) {
        for (const a of activitiesRes.data) {
          const icon = getActivityIcon(a.activity_type);
          const lead = a.leads as unknown as { full_name: string | null; lead_number: string | null } | null;
          events.push({
            id: `activity-${a.id}`,
            source: 'activity',
            type: a.activity_type,
            iconName: icon.iconName,
            iconColor: icon.iconColor,
            title: a.title,
            description: a.description,
            leadId: a.lead_id,
            leadName: lead?.full_name || null,
            leadNumber: lead?.lead_number || null,
            timestamp: a.created_at,
            metadata: a.metadata as Record<string, unknown> | undefined,
          });
        }
      }

      // Map email logs
      if (emailsRes.data) {
        for (const e of emailsRes.data) {
          const icon = getEmailIcon(e.status);
          const lead = e.leads as unknown as { full_name: string | null; lead_number: string | null } | null;
          const templateLabel = formatTemplateName(e.template_name);
          events.push({
            id: `email-${e.id}`,
            source: 'email',
            type: e.template_name || 'email',
            iconName: icon.iconName,
            iconColor: icon.iconColor,
            title: `${templateLabel} sent`,
            description: e.subject,
            leadId: e.lead_id,
            leadName: lead?.full_name || null,
            leadNumber: lead?.lead_number || null,
            timestamp: e.sent_at,
            metadata: { recipient: e.recipient_email, status: e.status },
          });
        }
      }

      // Map notifications
      if (notificationsRes.data) {
        for (const n of notificationsRes.data) {
          const icon = getNotificationIcon();
          const lead = n.leads as unknown as { full_name: string | null; lead_number: string | null } | null;
          events.push({
            id: `notification-${n.id}`,
            source: 'notification',
            type: n.type,
            iconName: icon.iconName,
            iconColor: icon.iconColor,
            title: n.title,
            description: n.message,
            leadId: n.lead_id,
            leadName: lead?.full_name || null,
            leadNumber: lead?.lead_number || null,
            timestamp: n.created_at,
          });
        }
      }

      // Sort by timestamp descending, take top N
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return events.slice(0, limit);
    },
    refetchInterval: 30000,
  });
}
