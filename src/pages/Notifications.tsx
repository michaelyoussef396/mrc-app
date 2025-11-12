import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  Mail,
  MailOpen,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAsUnread,
  useMarkAllAsRead,
  useDeleteNotification,
  type Notification,
} from '@/hooks/useNotifications';

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Fetch notifications
  const {
    data: notifications,
    isLoading,
    error,
  } = useNotifications({
    is_read: filter === 'unread' ? false : undefined,
  });

  const { data: unreadCount } = useUnreadCount();

  // Mutations
  const markAsReadMutation = useMarkAsRead();
  const markAsUnreadMutation = useMarkAsUnread();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'lead_created':
        return '👤';
      case 'status_changed':
        return '🔄';
      case 'job_completed':
        return '✅';
      case 'payment_received':
        return '💰';
      case 'inspection_scheduled':
        return '📅';
      default:
        return '🔔';
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsReadMutation.mutateAsync(notification.id);
    }

    // Navigate to related entity
    if (notification.lead_id) {
      navigate(`/leads/${notification.lead_id}`);
    }
  };

  // Toggle read/unread
  const handleToggleRead = async (
    notification: Notification,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Prevent navigation

    if (notification.is_read) {
      await markAsUnreadMutation.mutateAsync(notification.id);
    } else {
      await markAsReadMutation.mutateAsync(notification.id);
    }
  };

  // Delete notification
  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation

    if (confirm('Are you sure you want to delete this notification?')) {
      await deleteNotificationMutation.mutateAsync(notificationId);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with system events and activities
          </p>
        </div>

        {unreadCount && unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            {markAllAsReadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Marking...
              </>
            ) : (
              <>
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark All as Read
              </>
            )}
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            filter === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            All Notifications
          </div>
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            filter === 'unread'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Unread
            {unreadCount && unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
        </button>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-3 text-muted-foreground">Loading notifications...</p>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive font-semibold mb-2">
              Error loading notifications
            </p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Something went wrong'}
            </p>
          </CardContent>
        </Card>
      ) : notifications && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={cn(
                'group cursor-pointer hover:bg-muted/50 transition-colors',
                !notification.is_read && 'bg-blue-50 hover:bg-blue-100/50 border-l-4 border-l-blue-500'
              )}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center text-2xl',
                      !notification.is_read
                        ? 'bg-blue-100'
                        : 'bg-muted'
                    )}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'font-semibold text-sm md:text-base',
                          !notification.is_read && 'text-blue-900'
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <Badge variant="default" className="bg-blue-600 flex-shrink-0">
                          New
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span>
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                      {notification.metadata?.lead_number && (
                        <>
                          <span>•</span>
                          <span className="font-mono">
                            #{notification.metadata.lead_number}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleToggleRead(notification, e)}
                      title={notification.is_read ? 'Mark as unread' : 'Mark as read'}
                    >
                      {notification.is_read ? (
                        <MailOpen className="h-4 w-4" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => handleDelete(notification.id, e)}
                      title="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-semibold mb-2">No notifications</p>
            <p className="text-sm text-muted-foreground text-center">
              {filter === 'unread'
                ? "You're all caught up! No unread notifications."
                : 'When events happen in the system, notifications will appear here.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
