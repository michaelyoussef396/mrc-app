import { Activity } from 'lucide-react';
import { useActivityTimeline } from '@/hooks/useActivityTimeline';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import AdminPageLayout from '@/components/admin/AdminPageLayout';

export default function Notifications() {
  const { data: events = [], isLoading } = useActivityTimeline(50);

  return (
    <AdminPageLayout
      title="Recent Activity"
      subtitle="All activity across leads, emails, and notifications"
      icon="history"
    >
      {/* Activity Feed */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
        {!isLoading && events.length > 0 && (
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <Activity className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              Showing latest {events.length} events
            </span>
          </div>
        )}
        <ActivityTimeline
          events={events}
          isLoading={isLoading}
          showLeadName={true}
          compact={true}
        />
      </div>
    </AdminPageLayout>
  );
}
