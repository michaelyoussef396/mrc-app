import { useNavigate } from 'react-router-dom';
import TechnicianBottomNav from '@/components/technician/TechnicianBottomNav';
import {
  useTechnicianAlerts,
  TechnicianAlert,
  ALERT_TYPE_CONFIG,
  formatTimeAgo,
} from '@/hooks/useTechnicianAlerts';

// ============================================================================
// HEADER COMPONENT
// ============================================================================

interface AlertsHeaderProps {
  unreadCount: number;
  onMarkAllRead: () => void;
}

function AlertsHeader({ unreadCount, onMarkAllRead }: AlertsHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-4 py-3 flex items-center justify-between"
      style={{ borderBottom: '1px solid #f0f0f0' }}
    >
      <h1 className="text-2xl font-bold text-[#1d1d1f]">Alerts</h1>
      {unreadCount > 0 && (
        <button
          onClick={onMarkAllRead}
          className="text-[#007AFF] text-sm font-semibold active:opacity-70"
        >
          Mark all as read
        </button>
      )}
    </header>
  );
}

// ============================================================================
// ALERT CARD COMPONENT
// ============================================================================

interface AlertCardProps {
  alert: TechnicianAlert;
  onNavigate: (leadId: string) => void;
}

function AlertCard({ alert, onNavigate }: AlertCardProps) {
  const config = ALERT_TYPE_CONFIG[alert.type];
  const timeAgo = formatTimeAgo(alert.timestamp);

  // Unread: white bg with shadow | Read: grey bg with opacity
  const cardClasses = alert.isRead
    ? 'relative flex items-start gap-4 p-4 bg-[#f5f7f8] rounded-xl opacity-80'
    : 'relative flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100';

  // Font weight for title
  const titleClasses = alert.isRead
    ? 'text-base font-medium text-[#1d1d1f]'
    : 'text-base font-semibold text-[#1d1d1f]';

  const handleClick = () => {
    if (alert.leadId) {
      onNavigate(alert.leadId);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`${cardClasses} w-full text-left transition-transform active:scale-[0.98]`}
      style={{ minHeight: '48px' }}
    >
      {/* Icon Circle */}
      <div
        className="flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0"
        style={{ backgroundColor: config.iconBg }}
      >
        <span
          className="material-symbols-outlined text-[24px]"
          style={{ color: config.iconColor }}
        >
          {config.icon}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h3 className={titleClasses}>{alert.title}</h3>
          <span className="text-xs text-[#86868b] flex-shrink-0 ml-2">
            {timeAgo}
          </span>
        </div>
        <p className="text-sm text-[#86868b] truncate">{alert.message}</p>
      </div>

      {/* Unread Dot */}
      {!alert.isRead && (
        <div
          className="absolute right-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: '#007AFF' }}
        />
      )}
    </button>
  );
}

// ============================================================================
// OLDER DIVIDER
// ============================================================================

function OlderDivider() {
  return (
    <div className="py-4 flex justify-center">
      <span className="text-xs font-medium text-[#86868b] uppercase tracking-widest">
        Older
      </span>
    </div>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

interface EmptyStateProps {
  onRefresh: () => void;
}

function EmptyState({ onRefresh }: EmptyStateProps) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24">
      <div className="flex flex-col items-center gap-4">
        {/* Icon with checkmark badge */}
        <div className="relative mb-2">
          <div className="w-20 h-20 rounded-full bg-[#f0f2f4] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#86868b] text-[48px]">
              notifications_off
            </span>
          </div>
          <div
            className="absolute -bottom-1 -right-1 rounded-full p-1"
            style={{
              backgroundColor: '#34C759',
              border: '3px solid #f5f7f8',
            }}
          >
            <span className="material-symbols-outlined text-white text-[16px]">
              check
            </span>
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <h2 className="text-[#1d1d1f] text-xl font-bold">All caught up!</h2>
          <p className="text-[#86868b] text-base">
            No new notifications at the moment.
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          className="mt-4 text-[#007AFF] font-medium text-sm flex items-center gap-1 active:opacity-70"
          style={{ minHeight: '48px' }}
        >
          Refresh Status
          <span className="material-symbols-outlined text-[16px]">refresh</span>
        </button>
      </div>
    </main>
  );
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#86868b] text-sm">Loading alerts...</p>
      </div>
    </main>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function TechnicianAlerts() {
  const navigate = useNavigate();
  const {
    recentAlerts,
    olderAlerts,
    unreadCount,
    isLoading,
    markAllAsRead,
    refetch,
    hasAlerts,
  } = useTechnicianAlerts();

  const handleNavigate = (leadId: string) => {
    navigate(`/technician/job/${leadId}`);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#f5f7f8]">
      <AlertsHeader unreadCount={unreadCount} onMarkAllRead={markAllAsRead} />

      {isLoading ? (
        <LoadingState />
      ) : !hasAlerts ? (
        <EmptyState onRefresh={refetch} />
      ) : (
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-3">
          {/* Recent Alerts */}
          {recentAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onNavigate={handleNavigate} />
          ))}

          {/* Older Divider (only if there are older alerts) */}
          {olderAlerts.length > 0 && recentAlerts.length > 0 && (
            <OlderDivider />
          )}

          {/* Older Alerts (with extra opacity) */}
          {olderAlerts.map((alert) => (
            <div key={alert.id} className="opacity-60">
              <AlertCard alert={alert} onNavigate={handleNavigate} />
            </div>
          ))}
        </main>
      )}

      <TechnicianBottomNav />
    </div>
  );
}
