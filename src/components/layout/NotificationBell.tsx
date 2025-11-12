import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUnreadCount } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { data: unreadCount, isLoading } = useUnreadCount();

  return (
    <Link to="/notifications" className="relative">
      <div
        className="relative w-11 h-11 rounded-xl bg-white/10 border-0 text-white flex items-center justify-center cursor-pointer transition-all hover:bg-white/20"
        title={`${unreadCount || 0} unread notifications`}
      >
        <Bell size={20} strokeWidth={2} />
        {!isLoading && unreadCount && unreadCount > 0 && (
          <Badge
            variant="destructive"
            className={cn(
              'absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5 border-2 border-blue-900',
              'animate-pulse'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </div>
    </Link>
  );
}
