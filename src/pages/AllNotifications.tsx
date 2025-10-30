import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCircle, AlertCircle, Info, Trash2, Check, AlertTriangle } from 'lucide-react';

export default function AllNotifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'success' as const,
      icon: 'CheckCircle',
      title: 'Inspection Completed',
      message: 'Inspection for 45 High St, Croydon VIC 3136 has been completed successfully. The report is ready for review.',
      time: '2 hours ago',
      timestamp: '2025-10-30T14:00:00',
      unread: true,
    },
    {
      id: 2,
      type: 'info' as const,
      icon: 'Bell',
      title: 'New Lead Assigned',
      message: 'You have been assigned a new lead from Richmond area. Customer: John Smith, Property: 123 Church St.',
      time: '5 hours ago',
      timestamp: '2025-10-30T11:00:00',
      unread: true,
    },
    {
      id: 3,
      type: 'warning' as const,
      icon: 'AlertTriangle',
      title: 'Report Pending Review',
      message: 'Report for inspection MRC-2025-0040 requires your review and approval before sending to customer.',
      time: '1 day ago',
      timestamp: '2025-10-29T16:00:00',
      unread: false,
    },
    {
      id: 4,
      type: 'success' as const,
      icon: 'CheckCircle',
      title: 'Payment Received',
      message: 'Payment of $450.00 has been received for job #MRC-2025-0039. Invoice marked as paid.',
      time: '2 days ago',
      timestamp: '2025-10-28T10:30:00',
      unread: false,
    },
    {
      id: 5,
      type: 'info' as const,
      icon: 'Bell',
      title: 'Booking Confirmed',
      message: 'Customer Sarah Johnson confirmed booking for March 25, 2025 at 9:00 AM. Address: 78 Main Rd, Blackburn.',
      time: '3 days ago',
      timestamp: '2025-10-27T14:20:00',
      unread: false,
    },
    {
      id: 6,
      type: 'warning' as const,
      icon: 'AlertTriangle',
      title: 'Follow-up Required',
      message: 'Lead from October 20th has not been contacted yet. Please follow up with customer within 24 hours.',
      time: '4 days ago',
      timestamp: '2025-10-26T09:15:00',
      unread: false,
    },
    {
      id: 7,
      type: 'success' as const,
      icon: 'CheckCircle',
      title: 'Quote Accepted',
      message: 'Your quote of $1,250 for mould remediation at 56 Park Ave has been accepted by the customer.',
      time: '5 days ago',
      timestamp: '2025-10-25T11:45:00',
      unread: false,
    },
    {
      id: 8,
      type: 'info' as const,
      icon: 'Bell',
      title: 'Calendar Updated',
      message: 'Your inspection schedule for next week has been updated. You have 5 inspections scheduled.',
      time: '1 week ago',
      timestamp: '2025-10-23T08:00:00',
      unread: false,
    },
  ]);

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return n.unread;
    if (filter === 'read') return !n.unread;
    return true;
  });

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'CheckCircle':
        return CheckCircle;
      case 'Bell':
        return Bell;
      case 'AlertTriangle':
        return AlertTriangle;
      case 'Info':
        return Info;
      default:
        return Bell;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-5 py-5 bg-white border-b border-gray-200 shadow-sm">
        <button 
          className="w-10 h-10 rounded-xl bg-gray-100 border-0 text-gray-700 flex items-center justify-center cursor-pointer transition-all hover:bg-gray-200"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        <button 
          className="w-10 h-10 rounded-xl bg-gray-100 border-0 text-gray-700 flex items-center justify-center cursor-pointer transition-all hover:bg-gray-200"
          onClick={markAllAsRead}
          title="Mark all as read"
        >
          <Check size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-center gap-6 px-5 py-4 bg-white border-b border-gray-200">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total</span>
          <span className="text-2xl font-bold text-gray-900">{notifications.length}</span>
        </div>
        <div className="w-px h-10 bg-gray-200"></div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Unread</span>
          <span className="text-2xl font-bold text-blue-600">{unreadCount}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 px-5 py-4 bg-white border-b border-gray-200 overflow-x-auto">
        <button 
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full border-2 transition-all whitespace-nowrap ${
            filter === 'all' 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
          }`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full border-2 transition-all whitespace-nowrap ${
            filter === 'unread' 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
          }`}
          onClick={() => setFilter('unread')}
        >
          Unread
          {unreadCount > 0 && (
            <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
              filter === 'unread' ? 'bg-white/25 text-white' : 'bg-blue-600 text-white'
            }`}>
              {unreadCount}
            </span>
          )}
        </button>
        <button 
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full border-2 transition-all whitespace-nowrap ${
            filter === 'read' 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
          }`}
          onClick={() => setFilter('read')}
        >
          Read
        </button>
      </div>

      {/* Notifications List */}
      <div className="p-4">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-5">
              <Bell size={56} strokeWidth={1.5} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No notifications</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : "No notifications to display."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const IconComponent = getIcon(notification.icon);
            return (
              <div 
                key={notification.id}
                className={`group relative flex gap-3.5 p-4 md:p-[18px] mb-3 bg-white border-2 rounded-2xl transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
                  notification.unread 
                    ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-600' 
                    : 'border-gray-200'
                }`}
              >
                {/* Icon */}
                <div className={`w-12 h-12 md:w-[52px] md:h-[52px] rounded-[14px] flex items-center justify-center flex-shrink-0 ${
                  notification.type === 'success' 
                    ? 'bg-gradient-to-br from-green-100 to-green-200 text-green-600' :
                  notification.type === 'warning' 
                    ? 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-600' :
                  'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600'
                }`}>
                  <IconComponent size={24} strokeWidth={2} />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 pr-10">
                  <h3 className="text-base font-semibold text-gray-900 mb-1.5 leading-tight">
                    {notification.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-2">
                    {notification.message}
                  </p>
                  <span className="text-xs text-gray-500 font-medium">{notification.time}</span>
                </div>
                
                {/* Delete Button */}
                <button 
                  className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-transparent border-0 text-gray-400 flex items-center justify-center cursor-pointer transition-all hover:bg-red-100 hover:text-red-600 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                >
                  <Trash2 size={18} strokeWidth={2} />
                </button>
                
                {/* Unread Dot */}
                {notification.unread && (
                  <div className="hidden md:block absolute top-[22px] right-5 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
