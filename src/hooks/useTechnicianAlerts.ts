import { useState, useCallback, useMemo } from 'react';

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
  // Optional metadata for navigation
  leadId?: string;
  bookingId?: string;
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
// MOCK DATA
// ============================================================================

// TODO: Replace with real notifications table when created
// TODO: Connect to Slack integration for triggers
const MOCK_ALERTS: TechnicianAlert[] = [
  {
    id: 'alert-1',
    type: 'new_job',
    title: 'New Inspection Assigned',
    message: 'John Smith - 123 Main St, Melbourne',
    timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    isRead: false,
    leadId: 'a1111111-1111-1111-1111-111111111111',
    bookingId: 'b1111111-1111-1111-1111-111111111111',
  },
  {
    id: 'alert-2',
    type: 'schedule_change',
    title: 'Schedule Changed',
    message: 'Inspection moved to 2:00 PM tomorrow',
    timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    isRead: false,
    leadId: 'a2222222-2222-2222-2222-222222222222',
    bookingId: 'b2222222-2222-2222-2222-222222222222',
  },
  {
    id: 'alert-3',
    type: 'reminder',
    title: 'Upcoming Inspection',
    message: 'Reminder: 456 Oak Ave in 30 minutes',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isRead: true,
    leadId: 'a3333333-3333-3333-3333-333333333333',
    bookingId: 'b3333333-3333-3333-3333-333333333333',
  },
  {
    id: 'alert-4',
    type: 'cancelled',
    title: 'Inspection Cancelled',
    message: 'Client cancelled - 789 Pine Ln',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    isRead: true,
    leadId: 'a4444444-4444-4444-4444-444444444444',
  },
  {
    id: 'alert-5',
    type: 'system',
    title: 'System Update',
    message: 'App updated to version 2.4.1',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    isRead: true,
  },
];

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
  markAsRead: (alertId: string) => void;
  markAllAsRead: () => void;
  refetch: () => void;
  hasAlerts: boolean;
}

export function useTechnicianAlerts(): UseTechnicianAlertsResult {
  // TODO: Replace with real data fetching from notifications table
  const [alerts, setAlerts] = useState<TechnicianAlert[]>(MOCK_ALERTS);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  // Mark single alert as read
  const markAsRead = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, isRead: true } : alert
      )
    );
    // TODO: Update database when notifications table exists
  }, []);

  // Mark all alerts as read
  const markAllAsRead = useCallback(() => {
    setAlerts((prev) => prev.map((alert) => ({ ...alert, isRead: true })));
    // TODO: Update database when notifications table exists
  }, []);

  // Refetch alerts
  const refetch = useCallback(() => {
    // TODO: Refetch from database when notifications table exists
    setAlerts(MOCK_ALERTS);
  }, []);

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

  return {
    alerts,
    recentAlerts,
    olderAlerts,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refetch,
    hasAlerts: alerts.length > 0,
  };
}
