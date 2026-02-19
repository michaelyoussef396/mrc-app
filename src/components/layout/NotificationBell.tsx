import { Link } from 'react-router-dom';
import { useUnreadCount } from '@/hooks/useNotifications';

export function NotificationBell() {
  const { data: unreadCount, isLoading } = useUnreadCount();

  return (
    <Link to="/admin/activity" className="relative">
      <div
        className="relative w-11 h-11 rounded-xl bg-white/10 border-0 text-white flex items-center justify-center cursor-pointer transition-all hover:bg-white/20"
        title={`${unreadCount || 0} new activity`}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '20px' }}
        >
          history
        </span>
        {!isLoading && unreadCount && unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center animate-pulse border-2 border-blue-900"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </Link>
  );
}
