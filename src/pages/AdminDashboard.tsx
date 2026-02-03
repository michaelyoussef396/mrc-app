import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import StatsCard from '@/components/admin/StatsCard';
import CreateLeadModal from '@/components/admin/CreateLeadModal';
import { useAdminDashboardStats } from '@/hooks/useAdminDashboardStats';
import { useTodaysSchedule } from '@/hooks/useTodaysSchedule';
import { useUnassignedLeads } from '@/hooks/useUnassignedLeads';

// Status badge styling based on lead status
const getStatusStyle = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'new_lead':
    case 'hipages_lead':
      return { bg: 'rgba(0, 122, 255, 0.1)', color: '#007AFF', label: 'New' };
    case 'contacted':
      return { bg: 'rgba(255, 149, 0, 0.1)', color: '#FF9500', label: 'Contacted' };
    case 'inspection_waiting':
    case 'inspection_scheduled':
      return { bg: 'rgba(147, 51, 234, 0.1)', color: 'rgb(147, 51, 234)', label: 'Scheduled' };
    case 'inspection_in_progress':
      return { bg: 'rgba(0, 122, 255, 0.1)', color: '#007AFF', label: 'In Progress' };
    case 'approve_inspection_report':
      return { bg: 'rgba(255, 149, 0, 0.1)', color: '#FF9500', label: 'Pending Approval' };
    case 'job_completed':
    case 'paid':
    case 'finished':
      return { bg: 'rgba(52, 199, 89, 0.1)', color: '#34C759', label: 'Completed' };
    case 'invoicing_sent':
      return { bg: 'rgba(52, 199, 89, 0.1)', color: '#34C759', label: 'Invoiced' };
    case 'closed':
    case 'cancelled':
      return { bg: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', label: 'Closed' };
    default:
      return { bg: 'rgba(134, 134, 139, 0.1)', color: '#86868b', label: status || 'Unknown' };
  }
};

// Technician badge color
const getTechnicianColor = (name: string) => {
  if (name?.toLowerCase().includes('clayton')) return '#007AFF';
  if (name?.toLowerCase().includes('glen')) return '#34C759';
  return '#86868b';
};

const teamWorkload = [
  { name: 'Clayton', initials: 'C', color: '#007AFF', inspections: 3, progress: 60 },
  { name: 'Glen', initials: 'G', color: '#34C759', inspections: 2, progress: 40 },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState('');
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);

  // Handle Coming Soon toast for features not yet built
  const handleComingSoon = (featureName: string) => {
    setComingSoonFeature(featureName);
    setShowComingSoon(true);
    // Auto-hide after 3 seconds
    setTimeout(() => setShowComingSoon(false), 3000);
  };

  // Fetch real dashboard stats from Supabase
  const {
    todaysJobs,
    leadsToAssign,
    completedThisWeek,
    revenueThisWeek,
    isLoading: statsLoading,
  } = useAdminDashboardStats();

  // Fetch today's schedule from Supabase
  const { schedule, isLoading: scheduleLoading, error: scheduleError } = useTodaysSchedule();

  // Fetch unassigned leads from Supabase
  const {
    leads: unassignedLeadsData,
    totalCount: unassignedCount,
    isLoading: unassignedLoading
  } = useUnassignedLeads();

  // Format currency for Australian dollars
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get user's display name
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#f5f7f8',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Coming Soon Toast */}
      {showComingSoon && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#1d1d1f] text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <span className="material-symbols-outlined" style={{ color: '#FF9500' }}>construction</span>
            <div>
              <p className="font-medium text-sm">{comingSoonFeature}</p>
              <p className="text-xs text-gray-400">Coming soon!</p>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content - no margin on mobile, margin on desktop */}
      <main className="ml-0 lg:ml-[260px] p-4 md:p-6 lg:p-8">
        {/* Header */}
        <AdminHeader
          userName={userName}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Stats Row - Responsive grid: 1 col mobile, 2 cols tablet, 4 cols desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <StatsCard
            title="Today's Jobs"
            value={statsLoading ? '...' : todaysJobs}
            icon="calendar_today"
            iconBg="bg-blue-50"
            iconColor="text-[#007AFF]"
          />
          <StatsCard
            title="Leads to Assign"
            value={statsLoading ? '...' : leadsToAssign}
            change={leadsToAssign > 0 ? 'Needs attention' : undefined}
            icon="person_add"
            iconBg={leadsToAssign > 0 ? 'bg-orange-50' : 'bg-gray-100'}
            iconColor={leadsToAssign > 0 ? 'text-[#FF9500]' : 'text-[#86868b]'}
            trend={leadsToAssign > 0 ? 'neutral' : undefined}
          />
          <StatsCard
            title="Completed This Week"
            value={statsLoading ? '...' : completedThisWeek}
            icon="check_circle"
            iconBg="bg-green-50"
            iconColor="text-[#34C759]"
          />
          <StatsCard
            title="Revenue This Week"
            value={statsLoading ? '...' : formatCurrency(revenueThisWeek)}
            icon="payments"
            iconBg="bg-green-50"
            iconColor="text-[#34C759]"
          />
        </div>

        {/* Two Column Layout - Stack on mobile/tablet, side by side on desktop */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left Column */}
          <div className="w-full lg:flex-[3] space-y-6 lg:space-y-8">
            {/* Today's Schedule */}
            <div
              className="bg-white rounded-2xl p-4 md:p-6 shadow-sm"
              style={{ border: '1px solid #e5e5e5' }}
            >
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2
                  className="text-base md:text-lg font-semibold"
                  style={{ color: '#1d1d1f' }}
                >
                  Today's Schedule
                </h2>
                <button
                  onClick={() => navigate('/admin/schedule')}
                  className="text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity min-h-[44px] px-2"
                  style={{ color: '#007AFF' }}
                >
                  View All
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    arrow_forward
                  </span>
                </button>
              </div>

              {/* Desktop Table View - hidden on mobile */}
              <div className="hidden md:block overflow-x-auto">
                {scheduleLoading ? (
                  <div className="py-12 text-center">
                    <div className="w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm" style={{ color: '#86868b' }}>Loading schedule...</p>
                  </div>
                ) : scheduleError ? (
                  <div className="py-12 text-center">
                    <span className="material-symbols-outlined text-4xl mb-2" style={{ color: '#FF3B30' }}>error</span>
                    <p className="text-sm" style={{ color: '#FF3B30' }}>{scheduleError}</p>
                  </div>
                ) : schedule.length === 0 ? (
                  <div className="py-12 text-center">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50" style={{ color: '#86868b' }}>event_available</span>
                    <p className="text-sm" style={{ color: '#86868b' }}>No inspections scheduled for today</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
                        <th className="text-left py-3 px-2 text-xs font-semibold uppercase" style={{ color: '#86868b' }}>
                          Time
                        </th>
                        <th className="text-left py-3 px-2 text-xs font-semibold uppercase" style={{ color: '#86868b' }}>
                          Client
                        </th>
                        <th className="text-left py-3 px-2 text-xs font-semibold uppercase hidden lg:table-cell" style={{ color: '#86868b' }}>
                          Technician
                        </th>
                        <th className="text-left py-3 px-2 text-xs font-semibold uppercase hidden xl:table-cell" style={{ color: '#86868b' }}>
                          Type
                        </th>
                        <th className="text-left py-3 px-2 text-xs font-semibold uppercase" style={{ color: '#86868b' }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((item) => {
                        const statusStyle = getStatusStyle(item.leadStatus);
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            style={{ borderBottom: '1px solid #f0f0f0' }}
                            onClick={() => item.leadId && navigate(`/lead/${item.leadId}`)}
                          >
                            <td className="py-4 px-2">
                              <span className="text-sm font-medium" style={{ color: '#1d1d1f' }}>
                                {item.time}
                              </span>
                            </td>
                            <td className="py-4 px-2">
                              <div>
                                <p className="text-sm font-medium" style={{ color: '#1d1d1f' }}>
                                  {item.clientName}
                                </p>
                                <p className="text-xs" style={{ color: '#86868b' }}>
                                  {item.address}{item.suburb ? `, ${item.suburb}` : ''}
                                </p>
                              </div>
                            </td>
                            <td className="py-4 px-2 hidden lg:table-cell">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                                  style={{ backgroundColor: getTechnicianColor(item.technicianName) }}
                                >
                                  {item.technicianInitial}
                                </div>
                                <span className="text-sm" style={{ color: '#1d1d1f' }}>
                                  {item.technicianName}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-2 hidden xl:table-cell">
                              <span className="text-sm" style={{ color: '#1d1d1f' }}>
                                {item.inspectionType}
                              </span>
                            </td>
                            <td className="py-4 px-2">
                              <span
                                className="px-2.5 py-1 rounded-full text-xs font-medium"
                                style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                              >
                                {statusStyle.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Mobile Card View - visible only on mobile */}
              <div className="md:hidden space-y-3">
                {scheduleLoading ? (
                  <div className="py-12 text-center">
                    <div className="w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm" style={{ color: '#86868b' }}>Loading schedule...</p>
                  </div>
                ) : scheduleError ? (
                  <div className="py-12 text-center">
                    <span className="material-symbols-outlined text-4xl mb-2" style={{ color: '#FF3B30' }}>error</span>
                    <p className="text-sm" style={{ color: '#FF3B30' }}>{scheduleError}</p>
                  </div>
                ) : schedule.length === 0 ? (
                  <div className="py-12 text-center">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50" style={{ color: '#86868b' }}>event_available</span>
                    <p className="text-sm" style={{ color: '#86868b' }}>No inspections scheduled for today</p>
                  </div>
                ) : (
                  schedule.map((item) => {
                    const statusStyle = getStatusStyle(item.leadStatus);
                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                        style={{ border: '1px solid #f0f0f0' }}
                        onClick={() => item.leadId && navigate(`/lead/${item.leadId}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold" style={{ color: '#1d1d1f' }}>
                              {item.clientName}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: '#86868b' }}>
                              {item.time} • {item.inspectionType}
                            </p>
                          </div>
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
                            style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                          >
                            {statusStyle.label}
                          </span>
                        </div>
                        <p className="text-xs mb-2" style={{ color: '#86868b' }}>
                          {item.address}{item.suburb ? `, ${item.suburb}` : ''}
                        </p>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{ backgroundColor: getTechnicianColor(item.technicianName) }}
                          >
                            {item.technicianInitial}
                          </div>
                          <span className="text-xs font-medium" style={{ color: '#1d1d1f' }}>
                            {item.technicianName}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
              style={{ border: '1px solid #e5e5e5' }}
            >
              {/* Header with Coming Soon badge */}
              <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100">
                <h2
                  className="text-base md:text-lg font-semibold"
                  style={{ color: '#1d1d1f' }}
                >
                  Recent Activity
                </h2>
                <span className="text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: '#f0f0f0', color: '#86868b' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>notifications</span>
                  Coming Soon
                </span>
              </div>

              {/* Preview Content */}
              <div className="p-4 md:p-6">
                {/* Coming Soon Notice */}
                <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: 'rgba(0, 122, 255, 0.05)', border: '1px solid rgba(0, 122, 255, 0.2)' }}>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined mt-0.5" style={{ color: '#007AFF', fontSize: '18px' }}>info</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1d1d1f' }}>Live Activity Feed Coming Soon</p>
                      <p className="text-xs mt-0.5" style={{ color: '#86868b' }}>
                        Real-time notifications for new leads, completed inspections, and team updates will appear here.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Example Activities (Preview/Demo) */}
                <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: '#86868b' }}>Preview</p>

                <div className="space-y-3 opacity-75">
                  {/* Example 1: New Lead */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)' }}>
                      <span className="material-symbols-outlined" style={{ color: '#007AFF', fontSize: '16px' }}>person_add</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: '#1d1d1f' }}>
                        <span className="font-medium">New lead from website</span>
                      </p>
                      <p className="text-xs" style={{ color: '#86868b' }}>Sarah M. • Richmond</p>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: '#86868b' }}>5m ago</span>
                  </div>

                  {/* Example 2: Inspection Completed */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)' }}>
                      <span className="material-symbols-outlined" style={{ color: '#34C759', fontSize: '16px' }}>check_circle</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: '#1d1d1f' }}>
                        <span className="font-medium">Inspection completed</span>
                      </p>
                      <p className="text-xs" style={{ color: '#86868b' }}>Clayton • 45 Chapel St</p>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: '#86868b' }}>1h ago</span>
                  </div>

                  {/* Example 3: Report Sent */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)' }}>
                      <span className="material-symbols-outlined" style={{ color: '#FF9500', fontSize: '16px' }}>send</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: '#1d1d1f' }}>
                        <span className="font-medium">Report sent to customer</span>
                      </p>
                      <p className="text-xs" style={{ color: '#86868b' }}>Peter W. • Hawthorn</p>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: '#86868b' }}>2h ago</span>
                  </div>

                  {/* Example 4: Booking Confirmed */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(88, 86, 214, 0.1)' }}>
                      <span className="material-symbols-outlined" style={{ color: '#5856D6', fontSize: '16px' }}>event_available</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: '#1d1d1f' }}>
                        <span className="font-medium">Booking confirmed</span>
                      </p>
                      <p className="text-xs" style={{ color: '#86868b' }}>Emma D. • South Yarra</p>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: '#86868b' }}>3h ago</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 px-4 md:px-6 py-3" style={{ backgroundColor: '#f5f7f8' }}>
                <p className="text-xs text-center" style={{ color: '#86868b' }}>
                  Activity notifications will be available in a future update
                </p>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-full lg:flex-[2] space-y-6">
            {/* Unassigned Leads */}
            <div
              className="bg-white rounded-2xl p-4 md:p-6 shadow-sm"
              style={{ border: '1px solid #e5e5e5' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-base md:text-lg font-semibold"
                  style={{ color: '#1d1d1f' }}
                >
                  Unassigned Leads
                </h2>
                {unassignedCount > 0 && (
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)', color: '#FF9500' }}
                  >
                    {unassignedCount} pending
                  </span>
                )}
              </div>

              {unassignedLoading ? (
                <div className="py-8 text-center">
                  <div className="w-5 h-5 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : unassignedLeadsData.length === 0 ? (
                <div className="py-8 text-center">
                  <span className="material-symbols-outlined text-[32px] mb-2 opacity-50" style={{ color: '#34C759' }}>check_circle</span>
                  <p className="text-sm" style={{ color: '#86868b' }}>All leads assigned!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unassignedLeadsData.slice(0, 5).map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => navigate(`/lead/${lead.id}`)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer min-h-[56px]"
                      style={{ border: '1px solid #f0f0f0' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                          style={{ backgroundColor: '#007AFF' }}
                        >
                          {lead.initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#1d1d1f' }}>
                            {lead.displayName}
                          </p>
                          <p className="text-xs" style={{ color: '#86868b' }}>
                            {lead.suburb}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: '#FF9500' }}
                        />
                        <span className="text-xs" style={{ color: '#86868b' }}>
                          {lead.timeAgo}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {unassignedCount > 0 && (
                <button
                  onClick={() => navigate('/admin/leads?filter=unassigned')}
                  className="w-full mt-4 py-3 text-sm font-medium rounded-xl transition-colors hover:bg-blue-50 min-h-[48px]"
                  style={{ color: '#007AFF', border: '1px solid #007AFF' }}
                >
                  View All Leads
                </button>
              )}
            </div>

            {/* Team Workload */}
            <div
              className="bg-white rounded-2xl p-4 md:p-6 shadow-sm"
              style={{ border: '1px solid #e5e5e5' }}
            >
              <h2
                className="text-base md:text-lg font-semibold mb-4"
                style={{ color: '#1d1d1f' }}
              >
                Team Workload
              </h2>

              <div className="space-y-4">
                {teamWorkload.map((tech) => (
                  <div key={tech.name} className="flex items-center gap-3 md:gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                      style={{ backgroundColor: tech.color }}
                    >
                      {tech.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate" style={{ color: '#1d1d1f' }}>
                          {tech.name}
                        </span>
                        <span className="text-xs flex-shrink-0 ml-2" style={{ color: '#86868b' }}>
                          {tech.inspections} inspections
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: '#f0f0f0' }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${tech.progress}%`,
                            backgroundColor: tech.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div
              className="bg-white rounded-2xl p-4 md:p-6 shadow-sm"
              style={{ border: '1px solid #e5e5e5' }}
            >
              <h2
                className="text-base md:text-lg font-semibold mb-4"
                style={{ color: '#1d1d1f' }}
              >
                Quick Actions
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {/* New Lead - Opens Modal */}
                <button
                  onClick={() => setShowCreateLeadModal(true)}
                  className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl transition-colors hover:bg-blue-50 min-h-[64px] relative"
                  style={{ border: '1px solid #e5e5e5' }}
                >
                  <div
                    className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)' }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '20px', color: '#007AFF' }}
                    >
                      person_add
                    </span>
                  </div>
                  <span className="text-xs md:text-sm font-medium" style={{ color: '#1d1d1f' }}>
                    New Lead
                  </span>
                </button>

                {/* Schedule */}
                <button
                  onClick={() => navigate('/admin/schedule')}
                  className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl transition-colors hover:bg-blue-50 min-h-[64px] relative"
                  style={{ border: '1px solid #e5e5e5' }}
                >
                  <div
                    className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)' }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '20px', color: '#007AFF' }}
                    >
                      calendar_add_on
                    </span>
                  </div>
                  <span className="text-xs md:text-sm font-medium" style={{ color: '#1d1d1f' }}>
                    Schedule
                  </span>
                </button>

                {/* Reports - Coming Soon */}
                <button
                  onClick={() => handleComingSoon('Reports')}
                  className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl transition-colors hover:bg-green-50 min-h-[64px] relative"
                  style={{ border: '1px solid #e5e5e5' }}
                >
                  <div
                    className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)' }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '20px', color: '#34C759' }}
                    >
                      summarize
                    </span>
                  </div>
                  <span className="text-xs md:text-sm font-medium" style={{ color: '#1d1d1f' }}>
                    Reports
                  </span>
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: '#FF9500' }} />
                </button>

                {/* Calendar - Coming Soon */}
                <button
                  onClick={() => handleComingSoon('Calendar')}
                  className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl transition-colors hover:bg-purple-50 min-h-[64px] relative"
                  style={{ border: '1px solid #e5e5e5' }}
                >
                  <div
                    className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(147, 51, 234, 0.1)' }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '20px', color: 'rgb(147, 51, 234)' }}
                    >
                      calendar_month
                    </span>
                  </div>
                  <span className="text-xs md:text-sm font-medium" style={{ color: '#1d1d1f' }}>
                    Calendar
                  </span>
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: '#FF9500' }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create Lead Modal */}
      <CreateLeadModal
        isOpen={showCreateLeadModal}
        onClose={() => setShowCreateLeadModal(false)}
        onSuccess={() => {
          // Refetch unassigned leads to show the new lead
          // The hook will auto-update on next render
        }}
      />
    </div>
  );
}
