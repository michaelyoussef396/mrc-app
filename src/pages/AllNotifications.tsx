import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCircle, AlertCircle, Info, Trash2 } from 'lucide-react';

export default function AllNotifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Mock notification data
  const notifications = [
    {
      id: 1,
      type: 'success' as const,
      icon: CheckCircle,
      title: 'Inspection Completed',
      message: 'Inspection for 45 High St, Croydon has been completed',
      time: '2 hours ago',
      read: false,
    },
    {
      id: 2,
      type: 'info' as const,
      icon: Bell,
      title: 'New Lead Assigned',
      message: 'You have been assigned a new lead from Richmond',
      time: '5 hours ago',
      read: false,
    },
    {
      id: 3,
      type: 'warning' as const,
      icon: AlertCircle,
      title: 'Report Pending',
      message: 'Report for inspection MRC-2025-0040 requires review',
      time: '1 day ago',
      read: true,
    },
    {
      id: 4,
      type: 'info' as const,
      icon: Info,
      title: 'Payment Received',
      message: 'Payment of $450 received for job #2025-0039',
      time: '2 days ago',
      read: true,
    },
    {
      id: 5,
      type: 'success' as const,
      icon: CheckCircle,
      title: 'Booking Confirmed',
      message: 'Customer confirmed booking for March 25, 2025',
      time: '3 days ago',
      read: true,
    },
    {
      id: 6,
      type: 'info' as const,
      icon: Info,
      title: 'New Inquiry Received',
      message: 'New inquiry from customer in Fitzroy',
      time: '4 days ago',
      read: true,
    },
    {
      id: 7,
      type: 'success' as const,
      icon: CheckCircle,
      title: 'Report Generated',
      message: 'PDF report for MRC-2025-0038 has been generated',
      time: '5 days ago',
      read: true,
    },
  ];

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-5 bg-white border-b border-gray-200">
        <button 
          className="w-10 h-10 rounded-xl bg-gray-100 border-0 text-gray-700 flex items-center justify-center cursor-pointer transition-all hover:bg-gray-200"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">All Notifications</h1>
        <div className="w-10"></div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 px-5 py-4 bg-white border-b border-gray-200">
        <button 
          className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
            filter === 'all' 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'bg-transparent border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
          }`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
            filter === 'unread' 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'bg-transparent border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
          }`}
          onClick={() => setFilter('unread')}
        >
          Unread
        </button>
        <button 
          className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
            filter === 'read' 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'bg-transparent border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
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
            <Bell size={48} strokeWidth={1.5} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No notifications</h3>
            <p className="text-sm text-gray-500">You're all caught up!</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const IconComponent = notification.icon;
            return (
              <div 
                key={notification.id}
                className={`flex gap-3.5 p-4 mb-3 bg-white border rounded-xl transition-all hover:shadow-md ${
                  !notification.read ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  notification.type === 'success' ? 'bg-green-100 text-green-600' :
                  notification.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <IconComponent size={24} strokeWidth={2} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">
                    {notification.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-1.5">
                    {notification.message}
                  </p>
                  <span className="text-xs text-gray-500">{notification.time}</span>
                </div>
                
                <button 
                  className="w-9 h-9 rounded-lg bg-transparent border-0 text-gray-400 flex items-center justify-center cursor-pointer transition-all hover:bg-red-50 hover:text-red-600 self-start"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle delete
                  }}
                >
                  <Trash2 size={18} strokeWidth={2} />
                </button>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
