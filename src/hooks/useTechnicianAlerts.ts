import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

export type AlertType = 'new_job' | 'schedule_change' | 'reminder' | 'cancelled' | 'system';

export interface TechnicianAlert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  leadId?: string;
}

export interface AlertTypeConfig {
  icon: string;
  iconBg: string;
  iconColor: string;
}

// ============================================================================
// ALERT TYPE CONFIGURATIONS
// ============================================================================

export const ALERT_TYPE_CONFIG: Record<AlertType, AlertTypeConfig> = {
  new_job: {
    icon: 'assignment',
    iconBg: '#E3F2FD',
    iconColor: '#007AFF',
  },
  schedule_change: {
    icon: 'schedule',
    iconBg: '#FFF3E0',
    iconColor: '#FF9500',
  },
  reminder: {
    icon: 'alarm',
    iconBg: '#E8F5E9',
    iconColor: '#34C759',
  },
  cancelled: {
    icon: 'cancel',
    iconBg: '#FFEBEE',
    iconColor: '#FF3B30',
  },
  system: {
    icon: 'info',
    iconBg: '#E5E5E5',
    iconColor: '#86868b',
  },
};

// ============================================================================
// ACTIVITY TYPE → ALERT TYPE MAPPING
// ============================================================================

function mapActivityType(activityType: string): AlertType {
  switch (activityType) {
    case 'inspection_booked':
      return 'new_job';
    case 'booking_cancelled':
      return 'cancelled';
    case 'status_change':
      return 'schedule_change';
    case 'email_sent':
      return 'system';
    default:
      return 'system';
  }
}

// ============================================================================
// TIME FORMATTING
// ============================================================================

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return '1d ago';
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
    });
  }
}

// ============================================================================
// HOOK
// ============================================================================

interface UseTechnicianAlertsResult {
  alerts: TechnicianAlert[];
  recentAlerts: TechnicianAlert[];
  olderAlerts: TechnicianAlert[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAllAsRead: () => void;
  refetch: () => void;
  hasAlerts: boolean;
}

export function useTechnicianAlerts(): UseTechnicianAlertsResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get last_alerts_read_at from user metadata
  const lastReadAt = user?.user_metadata?.last_alerts_read_at
    ? new Date(user.user_metadata.last_alerts_read_at)
    : null;

  // Fetch activities for leads assigned to this technician
  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['technician-alerts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get lead_ids from bookings assigned to this technician
      const { data: bookings, error: bookingsError } = await supabase
        .from('calendar_bookings')
        .select('lead_id')
        .eq('assigned_to', user.id);

      if (bookingsError) throw bookingsError;

      const leadIds = [...new Set(
        (bookings || []).map(b => b.lead_id).filter(Boolean) as string[]
      )];

      if (leadIds.length === 0) return [];

      // Fetch activities for those leads, most recent first
      const { data, error: activitiesError } = await supabase
        .from('activities')
        .select('id, lead_id, activity_type, title, description, created_at')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (activitiesError) throw activitiesError;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  // Transform activities into alerts
  const alerts: TechnicianAlert[] = useMemo(() => {
    if (!activities) return [];

    return activities.map((activity) => {
      const timestamp = new Date(activity.created_at);
      const isRead = lastReadAt ? timestamp <= lastReadAt : false;

      return {
        id: activity.id,
        type: mapActivityType(activity.activity_type),
        title: activity.title,
        message: activity.description || '',
        timestamp,
        isRead,
        leadId: activity.lead_id,
      };
    });
  }, [activities, lastReadAt]);

  // Split alerts into recent (< 24h) and older
  const { recentAlerts, olderAlerts } = useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recent: TechnicianAlert[] = [];
    const older: TechnicianAlert[] = [];

    alerts.forEach((alert) => {
      if (alert.timestamp > oneDayAgo) {
        recent.push(alert);
      } else {
        older.push(alert);
      }
    });

    return { recentAlerts: recent, olderAlerts: older };
  }, [alerts]);

  // Count unread alerts
  const unreadCount = useMemo(
    () => alerts.filter((a) => !a.isRead).length,
    [alerts]
  );

  // Mark all alerts as read by updating user_metadata
  const markAllAsRead = async () => {
    const { error: updateError } = await supabase.auth.updateUser({
      data: { last_alerts_read_at: new Date().toISOString() },
    });
    if (!updateError) {
      queryClient.invalidateQueries({ queryKey: ['technician-alerts'] });
    }
  };

  // Refetch alerts
  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['technician-alerts'] });
  };

  return {
    alerts,
    recentAlerts,
    olderAlerts,
    unreadCount,
    isLoading,
    error: error ? (error as Error).message : null,
    markAllAsRead,
    refetch,
    hasAlerts: alerts.length > 0,
  };
}
