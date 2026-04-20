
import { Bell } from 'lucide-react';
import { formatWeekdayDateAU } from '@/lib/dateUtils';

interface TechnicianHeaderProps {
  userName: string;
  subtitle?: string;
  showNotification?: boolean;
  hasUnread?: boolean;
  onNotificationClick?: () => void;
}

export default function TechnicianHeader({
  userName,
  subtitle,
  showNotification = true,
  hasUnread = false,
  onNotificationClick,
}: TechnicianHeaderProps) {
  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = () => formatWeekdayDateAU(new Date());

  // Get first initial for avatar
  const initial = userName.charAt(0).toUpperCase();

  return (
    <header
      className="sticky top-0 z-10 pt-4 pb-2 px-4 flex justify-between items-center"
      style={{ backgroundColor: 'rgba(245, 247, 248, 0.95)', backdropFilter: 'blur(8px)' }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm"
            style={{ backgroundColor: '#007AFF', border: '2px solid white' }}
          >
            {initial}
          </div>
          {/* Online indicator */}
          <div
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full"
            style={{ backgroundColor: '#34C759', border: '2px solid white' }}
          />
        </div>

        {/* Greeting */}
        <div className="flex flex-col">
          <h2
            className="text-lg font-bold leading-tight tracking-tight"
            style={{ color: '#1d1d1f' }}
          >
            {getGreeting()}, {userName}
          </h2>
          <p className="text-xs font-medium" style={{ color: '#86868b' }}>
            {subtitle || formatDate()}
          </p>
        </div>
      </div>

      {/* Notification Bell */}
      {showNotification && (
        <button
          onClick={onNotificationClick}
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm hover:bg-gray-50 transition-colors"
          style={{ minWidth: '48px', minHeight: '48px' }}
        >
          <Bell className="h-6 w-6" style={{ color: '#1d1d1f' }} />
          {/* Notification dot */}
          {hasUnread && (
            <span
              className="absolute top-2 right-2.5 w-2 h-2 rounded-full"
              style={{ backgroundColor: '#007AFF', border: '2px solid white' }}
            />
          )}
        </button>
      )}
    </header>
  );
}
