import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TechnicianBottomNav } from '@/components/technician';
import { useTechnicianJobs, TabFilter, TechnicianJob } from '@/hooks/useTechnicianJobs';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface TabConfig {
  id: TabFilter;
  label: string;
}

const TABS: TabConfig[] = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusStyles(status: string) {
  switch (status) {
    case 'scheduled':
      return { bg: 'rgba(0, 122, 255, 0.1)', color: '#007AFF', label: 'Scheduled' };
    case 'in_progress':
      return { bg: 'rgba(255, 149, 0, 0.1)', color: '#FF9500', label: 'In Progress' };
    case 'completed':
      return { bg: 'rgba(52, 199, 89, 0.1)', color: '#34C759', label: 'Completed' };
    case 'cancelled':
      return { bg: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', label: 'Cancelled' };
    default:
      return { bg: '#f0f2f4', color: '#86868b', label: status };
  }
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  }
  if (date.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }

  return date.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
  });
}

function getJobTypeIcon(eventType: string): string {
  if (eventType.toLowerCase().includes('removal') || eventType.toLowerCase().includes('job')) {
    return 'construction';
  }
  return 'search';
}

function getJobTypeLabel(eventType: string): string {
  if (eventType.toLowerCase().includes('removal')) {
    return 'Mould Removal';
  }
  if (eventType.toLowerCase().includes('job')) {
    return 'Mould Removal Job';
  }
  return 'Mould Inspection';
}

function getButtonLabel(eventType: string, status: string): string {
  const isJob = eventType.toLowerCase().includes('removal') || eventType.toLowerCase().includes('job');
  if (status === 'in_progress') {
    return isJob ? 'Resume Job' : 'Resume Inspection';
  }
  return isJob ? 'Start Job' : 'Start Inspection';
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Header with Tabs Component
function JobsHeader({
  activeTab,
  onTabChange,
  onSearch,
}: {
  activeTab: TabFilter;
  onTabChange: (tab: TabFilter) => void;
  onSearch: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 w-full bg-white/90 backdrop-blur-md border-b border-gray-200 overflow-x-hidden">
      <div className="px-4 pt-12 pb-2">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
          <button
            onClick={onSearch}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <span className="material-symbols-outlined">search</span>
          </button>
        </div>

        {/* Tab Pills - Horizontally Scrollable */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-5 py-3 text-sm rounded-full whitespace-nowrap flex-shrink-0 transition-colors ${isActive
                    ? 'bg-[#007AFF] text-white font-semibold'
                    : 'bg-white border border-gray-200 text-[#86868b] hover:bg-gray-50'
                  }`}
                style={{ minHeight: '48px' }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

// Active Job Card Component (for scheduled/in_progress jobs)
function ActiveJobCard({
  job,
  isToday,
  onCall,
  onDirections,
  onStartJob,
  onViewDetails,
}: {
  job: TechnicianJob;
  isToday: boolean;
  onCall: () => void;
  onDirections: () => void;
  onStartJob: () => void;
  onViewDetails: () => void;
}) {
  const statusStyles = getStatusStyles(job.status);
  const buttonLabel = getButtonLabel(job.eventType, job.status);
  const buttonIcon = job.status === 'in_progress' ? 'play_arrow' : 'arrow_forward';

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
      {/* Top Row - Info & Status */}
      <div className="flex justify-between items-start">
        <div>
          {/* Time Row */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#86868b] text-sm font-medium">{job.time}</span>
            {job.travelTimeMinutes && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-[#86868b] text-sm">{job.travelTimeMinutes} min travel</span>
              </>
            )}
          </div>
          {/* Client Name */}
          <h3 className="text-lg font-bold text-[#1d1d1f] leading-tight">{job.clientName}</h3>
          {/* Address */}
          <p className="text-[#86868b] text-sm mt-1">
            {job.address}
            {job.suburb && `, ${job.suburb}`}
          </p>
          {/* Job Type */}
          <div className="flex items-center gap-1 mt-1 text-[#86868b] text-xs">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
              {getJobTypeIcon(job.eventType)}
            </span>
            <span>{getJobTypeLabel(job.eventType)}</span>
          </div>
        </div>
        {/* Status Badge */}
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: statusStyles.bg, color: statusStyles.color }}
        >
          {statusStyles.label}
        </span>
      </div>

      {/* Action Buttons - Grid Layout */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCall}
          className="flex items-center justify-center gap-2 h-12 rounded-xl bg-[#f0f2f4] text-[#1d1d1f] text-sm font-semibold hover:bg-gray-200 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            call
          </span>
          Call
        </button>
        <button
          onClick={onDirections}
          className="flex items-center justify-center gap-2 h-12 rounded-xl bg-[#f0f2f4] text-[#1d1d1f] text-sm font-semibold hover:bg-gray-200 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            directions
          </span>
          Directions
        </button>
      </div>

      {/* Primary Action Buttons */}
      {isToday ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={onStartJob}
            className="w-full h-14 flex items-center justify-center gap-2 rounded-xl bg-[#007AFF] text-white text-base font-bold shadow-lg active:scale-[0.98] transition-all"
            style={{ boxShadow: '0 4px 12px rgba(0, 122, 255, 0.2)' }}
          >
            {job.status === 'in_progress' && (
              <span className="material-symbols-outlined">play_arrow</span>
            )}
            {buttonLabel}
            {job.status !== 'in_progress' && (
              <span className="material-symbols-outlined">{buttonIcon}</span>
            )}
          </button>
          <button
            onClick={onViewDetails}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-[#1d1d1f] text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              visibility
            </span>
            View Lead
          </button>
        </div>
      ) : (
        <button
          onClick={onViewDetails}
          className="w-full h-14 flex items-center justify-center gap-2 rounded-xl bg-[#f0f2f4] text-[#1d1d1f] text-base font-semibold hover:bg-gray-200 transition-colors"
        >
          <span className="material-symbols-outlined">visibility</span>
          View Lead
        </button>
      )}
    </div>
  );
}

// Completed Job Card Component (different layout per design)
function CompletedJobCard({ job, onViewLead }: { job: TechnicianJob; onViewLead: () => void }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
      {/* Top Row - Status & Date */}
      <div className="flex items-start justify-between">
        <span className="inline-flex items-center rounded-full bg-[rgba(52,199,89,0.1)] px-2.5 py-1 text-xs font-semibold text-[#34C759]">
          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-[#34C759]" />
          Completed
        </span>
        <span className="text-xs font-medium text-[#86868b]">{formatShortDate(job.date)}</span>
      </div>

      {/* Client Info */}
      <div className="space-y-1">
        <h3 className="text-lg font-bold leading-tight text-[#1d1d1f]">{job.clientName}</h3>
        <div className="flex items-center gap-1.5 text-sm text-[#86868b]">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            location_on
          </span>
          <span>
            {job.address}
            {job.suburb && `, ${job.suburb}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-[#86868b]">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {getJobTypeIcon(job.eventType)}
          </span>
          <span>{getJobTypeLabel(job.eventType)}</span>
        </div>
      </div>

      {/* Completion Time */}
      <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
        <span className="material-symbols-outlined text-[#34C759]" style={{ fontSize: '20px' }}>
          check_circle
        </span>
        <p className="text-sm font-medium text-[#34C759]">Completed at {job.time}</p>
      </div>

      {/* View Lead Button */}
      <button
        onClick={onViewLead}
        className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#f0f2f4] text-[#1d1d1f] text-sm font-semibold hover:bg-gray-200 transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
          visibility
        </span>
        View Lead
      </button>
    </article>
  );
}

// Empty State Component
function EmptyState({
  tab,
  onRefresh,
  isLoading,
}: {
  tab: TabFilter;
  onRefresh: () => void;
  isLoading: boolean;
}) {
  const messages: Record<TabFilter, { title: string; subtitle: string }> = {
    today: { title: 'No jobs scheduled for today', subtitle: 'Check back tomorrow' },
    this_week: { title: 'No jobs scheduled this week', subtitle: 'Check back later' },
    this_month: { title: 'No jobs scheduled this month', subtitle: 'Check back later' },
    upcoming: { title: 'No upcoming jobs scheduled', subtitle: 'New jobs will appear here' },
    completed: { title: 'No completed jobs yet', subtitle: 'Completed jobs will appear here' },
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="flex flex-col items-center text-center gap-6">
        {/* Icon Circle */}
        <div className="h-24 w-24 rounded-full bg-[#f0f2f4] flex items-center justify-center mb-2 shadow-sm">
          <span className="material-symbols-outlined text-[#86868b]" style={{ fontSize: '48px' }}>
            calendar_today
          </span>
        </div>

        {/* Message */}
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-[#1d1d1f] text-xl font-bold leading-tight">
            {messages[tab].title}
          </h2>
          <p className="text-[#86868b] text-base">{messages[tab].subtitle}</p>
        </div>

        {/* Refresh Button - Pill Style */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="mt-4 flex items-center justify-center gap-2 h-10 px-6 rounded-full bg-white border border-gray-200 shadow-sm active:scale-95 transition-all"
          style={{ opacity: isLoading ? 0.7 : 1 }}
        >
          <span
            className={`material-symbols-outlined text-[#007AFF] ${isLoading ? 'animate-spin' : ''}`}
            style={{ fontSize: '20px' }}
          >
            {isLoading ? 'progress_activity' : 'refresh'}
          </span>
          <span className="text-[#1d1d1f] text-sm font-semibold">
            {isLoading ? 'Refreshing...' : 'Refresh Schedule'}
          </span>
        </button>
      </div>
    </main>
  );
}

// Loading State Component
function LoadingState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16">
      <div
        className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mb-4"
        style={{ borderColor: '#007AFF', borderTopColor: 'transparent' }}
      />
      <p className="text-sm font-medium text-[#86868b]">Loading your jobs...</p>
    </div>
  );
}

// Error State Component
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
      <div className="h-24 w-24 rounded-full bg-[rgba(255,59,48,0.1)] flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-[#FF3B30]" style={{ fontSize: '48px' }}>
          error
        </span>
      </div>
      <h2 className="text-[#1d1d1f] text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-[#86868b] text-base text-center mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 h-10 px-6 rounded-full bg-white border border-gray-200 shadow-sm active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-[#007AFF]" style={{ fontSize: '20px' }}>
          refresh
        </span>
        <span className="text-[#1d1d1f] text-sm font-semibold">Try Again</span>
      </button>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function TechnicianJobs() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabFilter>('today');
  const { jobs, isLoading, error, refetch } = useTechnicianJobs(activeTab);

  // Get today's date for comparison
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' });

  // Group jobs by date
  const jobsByDate = jobs.reduce<Record<string, TechnicianJob[]>>((acc, job) => {
    if (!acc[job.date]) {
      acc[job.date] = [];
    }
    acc[job.date].push(job);
    return acc;
  }, {});

  // Sort dates
  const sortedDates = Object.keys(jobsByDate).sort((a, b) => {
    if (activeTab === 'completed') {
      return b.localeCompare(a); // Newest first
    }
    return a.localeCompare(b); // Earliest first
  });

  // Handlers
  const handleSearch = () => {
    console.log('Search clicked');
  };

  const handleCall = (phone: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleDirections = (job: TechnicianJob) => {
    const query = encodeURIComponent(job.fullAddress);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
  };

  const handleStartJob = (job: TechnicianJob) => {
    navigate(`/technician/job/${job.leadId}`);
  };

  const handleViewDetails = (job: TechnicianJob) => {
    navigate(`/technician/job/${job.leadId}`);
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f5f7f8] overflow-x-hidden">
      {/* Sticky Header with Tabs */}
      <JobsHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSearch={handleSearch}
      />

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : jobs.length === 0 ? (
          <EmptyState tab={activeTab} onRefresh={refetch} isLoading={isLoading} />
        ) : (
          <>
            {sortedDates.map((date) => (
              <div key={date}>
                {/* Date Header - show for multi-day views */}
                {activeTab !== 'today' && (
                  <h2 className="text-sm font-bold uppercase tracking-wider mb-3 px-1 text-[#86868b]">
                    {formatDateHeader(date)}
                  </h2>
                )}

                {/* Jobs List */}
                <div className="space-y-4">
                  {jobsByDate[date].map((job) =>
                    activeTab === 'completed' || job.status === 'completed' ? (
                      <CompletedJobCard key={job.id} job={job} onViewLead={() => handleViewDetails(job)} />
                    ) : (
                      <ActiveJobCard
                        key={job.id}
                        job={job}
                        isToday={job.date === today}
                        onCall={() => handleCall(job.phone)}
                        onDirections={() => handleDirections(job)}
                        onStartJob={() => handleStartJob(job)}
                        onViewDetails={() => handleViewDetails(job)}
                      />
                    )
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <TechnicianBottomNav />
    </div>
  );
}
