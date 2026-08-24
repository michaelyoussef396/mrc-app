import { useState, useRef, useEffect, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isInternalPath } from '@/lib/utils/navigation';
import AdminSearchBar from './AdminSearchBar';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  type Notification,
} from '@/hooks/useNotifications';
import {
  ArrowLeft,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  FileText,
  LogOut,
  Mail,
  Menu,
  Search,
  Settings,
  User,
  UserPlus,
} from 'lucide-react';

/** Rows shown in the header's notification dropdown before "View All Activity" takes over. */
const NOTIFICATION_DROPDOWN_LIMIT = 8;

interface AdminHeaderProps {
  userName?: string;
  onMenuClick?: () => void;
}

export default function AdminHeader({ userName = 'Admin', onMenuClick }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Get first initial for avatar
  const initial = userName.charAt(0).toUpperCase();

  return (
    <header className="flex items-center justify-between mb-6 lg:mb-8">
      {/* Left Section - Menu button (mobile) + Welcome */}
      <div className="flex items-center gap-3">
        {/* Hamburger menu - visible on mobile/tablet */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-12 h-12 rounded-xl bg-white flex items-center justify-center hover:bg-gray-50 transition-all"
          style={{ border: '1px solid #e5e5e5' }}
        >
          <Menu className="h-6 w-6" style={{ color: '#1d1d1f' }} />
        </button>

        {/* Welcome Section */}
        <div>
          {/* Desktop: Full greeting */}
          <h1
            className="hidden md:block text-xl lg:text-2xl font-bold"
            style={{ color: '#1d1d1f' }}
          >
            Good {getTimeOfDay()}, {userName}
          </h1>
          {/* Mobile: Short title */}
          <h1
            className="md:hidden text-lg font-bold"
            style={{ color: '#1d1d1f' }}
          >
            Dashboard
          </h1>
          <p
            className="hidden md:block text-xs lg:text-sm mt-1"
            style={{ color: '#86868b' }}
          >
            Here's what's happening with your team today
          </p>
        </div>
      </div>

      {/* Right Section - Search & Profile */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Desktop Search - hidden on mobile */}
        <div className="hidden md:block">
          <AdminSearchBar />
        </div>

        {/* Mobile Search Button */}
        <button
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="md:hidden relative w-12 h-12 rounded-xl bg-white flex items-center justify-center hover:bg-gray-50 transition-all"
          style={{ border: '1px solid #e5e5e5' }}
        >
          <Search className="h-6 w-6" style={{ color: '#86868b' }} />
        </button>

        {/* Notifications */}
        <NotificationDropdown
          ref={notificationRef}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          navigate={navigate}
        />

        {/* Profile - Desktop shows full, mobile shows avatar only */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-xl bg-white hover:bg-gray-50 transition-all"
            style={{ border: '1px solid #e5e5e5' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
              style={{ backgroundColor: '#007AFF' }}
            >
              {initial}
            </div>
            {/* Hide name on mobile */}
            <span
              className="hidden md:block text-sm font-medium"
              style={{ color: '#1d1d1f' }}
            >
              {userName}
            </span>
            <ChevronDown className="hidden md:block h-[18px] w-[18px]" style={{ color: '#86868b' }} />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg py-2 z-50"
              style={{ border: '1px solid #e5e5e5' }}
            >
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/admin/profile');
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2 min-h-[48px]"
                style={{ color: '#1d1d1f' }}
              >
                <User className="h-[18px] w-[18px]" />
                Profile
              </button>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/admin/settings');
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2 min-h-[48px]"
                style={{ color: '#1d1d1f' }}
              >
                <Settings className="h-[18px] w-[18px]" />
                Settings
              </button>
              <hr className="my-2 border-gray-100" />
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2 min-h-[48px]"
                style={{ color: '#FF3B30' }}
              >
                <LogOut className="h-[18px] w-[18px]" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="md:hidden fixed inset-x-0 top-0 bg-white p-4 z-50 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMobileSearch(false)}
              className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-100 flex-shrink-0"
            >
              <ArrowLeft className="h-6 w-6" style={{ color: '#86868b' }} />
            </button>
            <AdminSearchBar compact onClose={() => setShowMobileSearch(false)} />
          </div>
        </div>
      )}
    </header>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

interface NotificationDropdownProps {
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  navigate: (path: string) => void;
}

/**
 * Maps a notification's free-text `type` column to a representative icon.
 * The schema has no fixed type taxonomy yet, so this matches on common
 * substrings and falls back to a generic bell for anything unrecognised.
 */
function getNotificationTypeIcon(type: string): typeof Bell {
  const lower = type.toLowerCase();
  if (lower.includes('lead')) return UserPlus;
  if (lower.includes('inspection') || lower.includes('booking')) return Calendar;
  if (lower.includes('invoice') || lower.includes('payment')) return DollarSign;
  if (lower.includes('job') || lower.includes('completion')) return CheckCircle2;
  if (lower.includes('email')) return Mail;
  if (lower.includes('report')) return FileText;
  return Bell;
}

// Writers set is_read=false explicitly on creation, so a NULL value is
// data that predates that convention or was never touched — treat it as
// unread for display. The unread-count query (`.eq('is_read', false)`)
// does NOT match NULL, so a NULL row shows here but is not counted in the
// badge; that's an existing DB-level gap, not something this component fixes.
function isNotificationUnread(notification: Notification): boolean {
  return notification.is_read !== true;
}

const RELATIVE_TIME_MINUTE_MS = 60_000;
const RELATIVE_TIME_HOUR_MS = 60 * RELATIVE_TIME_MINUTE_MS;
const RELATIVE_TIME_DAY_MS = 24 * RELATIVE_TIME_HOUR_MS;
const RELATIVE_TIME_WEEK_DAYS = 7;

/** Short relative-time label for a notification row (e.g. "5 mins ago"). */
function formatNotificationTime(dateString: string | null): string {
  if (!dateString) return '';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / RELATIVE_TIME_MINUTE_MS);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMs / RELATIVE_TIME_HOUR_MS);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffMs / RELATIVE_TIME_DAY_MS);
  if (diffDays < RELATIVE_TIME_WEEK_DAYS) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return new Date(dateString).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

const NotificationDropdown = forwardRef<HTMLDivElement, NotificationDropdownProps>(
  function NotificationDropdown({ showNotifications, setShowNotifications, navigate }, ref) {
    const { data: unreadCount } = useUnreadCount();
    const { data: notifications = [], isLoading } = useNotifications({
      limit: NOTIFICATION_DROPDOWN_LIMIT,
    });
    const markAllAsRead = useMarkAllAsRead();
    const markAsRead = useMarkAsRead();

    const handleMarkAllAsRead = async () => {
      await markAllAsRead.mutateAsync();
    };

    const handleNotificationClick = (notification: Notification) => {
      if (isNotificationUnread(notification)) {
        markAsRead.mutate(notification.id);
      }
      setShowNotifications(false);
      if (notification.action_url && isInternalPath(notification.action_url)) {
        navigate(notification.action_url);
      } else if (notification.lead_id) {
        navigate(`/leads/${notification.lead_id}`);
      }
      // No action_url and no lead_id: nothing to navigate to, dropdown just closes.
    };

    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          data-testid="notification-bell-trigger"
          className="relative w-12 h-12 rounded-xl bg-white flex items-center justify-center hover:bg-gray-50 transition-all"
          style={{ border: '1px solid #e5e5e5' }}
        >
          <Bell className="h-6 w-6" style={{ color: '#86868b' }} />
          {/* Unread badge */}
          {(unreadCount ?? 0) > 0 && (
            <span
              data-testid="notification-unread-badge"
              className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-white text-xs font-bold flex items-center justify-center"
              style={{ backgroundColor: '#FF3B30', fontSize: '11px' }}
            >
              {unreadCount! > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-lg overflow-hidden z-50"
            style={{ border: '1px solid #e5e5e5', maxHeight: '480px' }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid #f0f0f0' }}
            >
              <h3 className="font-semibold" style={{ color: '#1d1d1f' }}>
                Notifications
              </h3>
              {(unreadCount ?? 0) > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsRead.isPending}
                  className="min-h-[48px] inline-flex items-center px-1 text-xs font-medium hover:underline disabled:opacity-50"
                  style={{ color: '#007AFF' }}
                >
                  {markAllAsRead.isPending ? 'Marking...' : 'Mark all as read'}
                </button>
              )}
            </div>

            {/* Content */}
            <div
              data-testid="notification-list"
              className="overflow-y-auto px-1 py-1"
              style={{ maxHeight: '340px' }}
            >
              {isLoading ? (
                <div className="space-y-1 p-2" aria-hidden="true">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center px-4">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const TypeIcon = getNotificationTypeIcon(notification.type);
                  const unread = isNotificationUnread(notification);
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className="w-full min-h-[48px] flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${unread ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}
                      >
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm truncate ${unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">{notification.message}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {formatNotificationTime(notification.created_at)}
                        </p>
                      </div>
                      {unread && (
                        <span
                          className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5"
                          aria-label="Unread"
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div
              className="px-4 py-3 text-center"
              style={{ backgroundColor: '#f5f7f8', borderTop: '1px solid #f0f0f0' }}
            >
              <button
                onClick={() => {
                  setShowNotifications(false);
                  navigate('/admin/activity');
                }}
                className="text-sm font-medium hover:underline"
                style={{ color: '#007AFF' }}
              >
                View All Activity
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
