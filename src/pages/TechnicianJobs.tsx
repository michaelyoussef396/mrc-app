import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { TechnicianBottomNav } from '@/components/technician';
import { useTechnicianJobs, TabFilter, TechnicianJob } from '@/hooks/useTechnicianJobs';
import { useRevisionJobs, RevisionJob } from '@/hooks/useRevisionJobs';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Eye,
  HardHat,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Play,
  RefreshCw,
  Search,
} from 'lucide-react';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type JobTab = 'revisions' | TabFilter;

interface TabConfig {
  id: JobTab;
  label: string;
}

const TABS: TabConfig[] = [
  { id: 'revisions', label: 'Revisions' },
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

function getJobTypeIcon(eventType: string, className: string = "h-3.5 w-3.5"): ReactNode {
  if (eventType.toLowerCase().includes('removal') || eventType.toLowerCase().includes('job')) {
    return <HardHat className={className} />;
  }
  return <Search className={className} />;
}

function getJobTypeLabel(eventType: string): string {
  if (eventType.toLowerCase().includes('removal')) {
    return 'Remediation Job';
  }
  if (eventType.toLowerCase().includes('job')) {
    return 'Remediation Job';
  }
  return 'Mould Inspection';
}

function isRemediationJob(eventType: string): boolean {
  const t = eventType.toLowerCase();
  return t.includes('job') || t.includes('removal');
}

function getButtonLabel(eventType: string, status: string): string {
  const isJob = eventType.toLowerCase().includes('removal') || eventType.toLowerCase().includes('job');
  if (status === 'in_progress') {
    return isJob ? 'Continue Job Completion' : 'Resume Inspection';
  }
  return isJob ? 'Start Job Completion' : 'Start Inspection';
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Header with Tabs Component
function JobsHeader({
  activeTab,
  onTabChange,
  counts,
}: {
  activeTab: JobTab;
  onTabChange: (tab: JobTab) => void;
  counts: {
    revisions: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    upcoming: number;
    completed: number;
  };
}) {
  const countByTab: Record<JobTab, number> = {
    revisions: counts.revisions,
    today: counts.today,
    this_week: counts.thisWeek,
    this_month: counts.thisMonth,
    upcoming: counts.upcoming,
    completed: counts.completed,
  };

  return (
    <header className="sticky top-0 z-20 w-full bg-white/90 backdrop-blur-md border-b border-gray-200 overflow-x-hidden">
      <div className="px-4 pt-12 pb-2">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
        </div>

        {/* Tab Pills - Horizontally Scrollable */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = countByTab[tab.id];
            const showCount = count > 0;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm rounded-full whitespace-nowrap flex-shrink-0 transition-colors ${isActive
                    ? tab.id === 'revisions'
                      ? 'bg-amber-500 text-white font-semibold'
                      : 'bg-[#007AFF] text-white font-semibold'
                    : 'bg-white border border-gray-200 text-[#86868b] hover:bg-gray-50'
                  }`}
                style={{ minHeight: '48px' }}
              >
                <span>{tab.label}</span>
                {showCount && (
                  <span
                    className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold flex items-center justify-center ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : tab.id === 'revisions'
                          ? 'bg-amber-500 text-white'
                          : 'bg-[#007AFF] text-white'
                    }`}
                  >
                    {count}
                  </span>
                )}
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
          {/* Job Type + Day label for multi-day jobs */}
          <div className="flex items-center gap-2 mt-1 text-[#86868b] text-xs flex-wrap">
            <div className="flex items-center gap-1">
              {getJobTypeIcon(job.eventType, "h-3.5 w-3.5")}
              <span>{getJobTypeLabel(job.eventType)}</span>
            </div>
            {job.dayLabel && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
                {job.dayLabel}
              </span>
            )}
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
          <Phone className="h-5 w-5" />
          Call
        </button>
        <button
          onClick={onDirections}
          className="flex items-center justify-center gap-2 h-12 rounded-xl bg-[#f0f2f4] text-[#1d1d1f] text-sm font-semibold hover:bg-gray-200 transition-colors"
        >
          <Navigation className="h-5 w-5" />
          Directions
        </button>
      </div>

      {/* Primary Action Buttons
          Both inspections and remediation jobs always show the primary
          Start button (inspections always, jobs any day within the booking).
          Below it is a secondary "View Lead" button. */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onStartJob}
          className="w-full h-14 flex items-center justify-center gap-2 rounded-xl bg-[#007AFF] text-white text-base font-bold shadow-lg active:scale-[0.98] transition-all"
          style={{ boxShadow: '0 4px 12px rgba(0, 122, 255, 0.2)' }}
        >
          {job.status === 'in_progress' && (
            <Play className="h-5 w-5" />
          )}
          {buttonLabel}
          {job.status !== 'in_progress' && (
            buttonIcon === 'play_arrow' ? <Play className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />
          )}
        </button>
        <button
          onClick={onViewDetails}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-[#1d1d1f] text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          <Eye className="h-5 w-5" />
          View Lead
        </button>
      </div>
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
          <MapPin className="h-[18px] w-[18px]" />
          <span>
            {job.address}
            {job.suburb && `, ${job.suburb}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-[#86868b]">
          {getJobTypeIcon(job.eventType, "h-[18px] w-[18px]")}
          <span>{getJobTypeLabel(job.eventType)}</span>
        </div>
      </div>

      {/* Completion Time */}
      <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
        <CheckCircle2 className="h-5 w-5 text-[#34C759]" />
        <p className="text-sm font-medium text-[#34C759]">Completed at {job.time}</p>
      </div>

      {/* View Lead Button */}
      <button
        onClick={onViewLead}
        className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#f0f2f4] text-[#1d1d1f] text-sm font-semibold hover:bg-gray-200 transition-colors"
      >
        <Eye className="h-5 w-5" />
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
  tab: JobTab;
  onRefresh: () => void;
  isLoading: boolean;
}) {
  const messages: Record<JobTab, { title: string; subtitle: string }> = {
    revisions: { title: 'No revisions needed', subtitle: 'All job completions are up to date' },
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
          <CalendarDays className="h-12 w-12 text-[#86868b]" />
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
          {isLoading ? <Loader2 className="h-5 w-5 text-[#007AFF] animate-spin" /> : <RefreshCw className="h-5 w-5 text-[#007AFF]" />}
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
        <AlertCircle className="h-12 w-12 text-[#FF3B30]" />
      </div>
      <h2 className="text-[#1d1d1f] text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-[#86868b] text-base text-center mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 h-10 px-6 rounded-full bg-white border border-gray-200 shadow-sm active:scale-95 transition-all"
      >
        <RefreshCw className="h-5 w-5 text-[#007AFF]" />
        <span className="text-[#1d1d1f] text-sm font-semibold">Try Again</span>
      </button>
    </div>
  );
}

// Revision Job Card Component
function RevisionCard({ revision, onRevise }: { revision: RevisionJob; onRevise: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <h3 className="text-lg font-bold text-[#1d1d1f] leading-tight">{revision.customerName}</h3>
          <div className="flex items-center gap-1.5 text-sm text-[#86868b]">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{revision.address}{revision.suburb && `, ${revision.suburb}`}</span>
          </div>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex-shrink-0">
          Revision
        </span>
      </div>
      {revision.sendBackNote && (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
          {revision.sendBackNote}
        </p>
      )}
      <button
        onClick={onRevise}
        className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-amber-500 text-white text-sm font-bold active:scale-[0.98] transition-all"
      >
        Revise Job Completion
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function TechnicianJobs() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<JobTab>('today');
  const { revisions, isLoading: revisionsLoading, count: revisionCount } = useRevisionJobs();

  const isRevisionsTab = activeTab === 'revisions';
  const jobsTab = isRevisionsTab ? 'today' : activeTab as TabFilter;
  const { jobs, isLoading, error, refetch, counts } = useTechnicianJobs(jobsTab);

  // Get today's date for comparison (YYYY-MM-DD in Melbourne timezone)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne' }).format(new Date());

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
    // Remediation jobs go to the job completion form; inspections go to the inspection form
    if (isRemediationJob(job.eventType)) {
      navigate(`/technician/job-completion/${job.leadId}`);
    } else {
      navigate(`/technician/inspection?leadId=${job.leadId}`);
    }
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
        counts={{ revisions: revisionCount, ...counts }}
      />

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {isRevisionsTab ? (
          revisionsLoading ? (
            <LoadingState />
          ) : revisions.length === 0 ? (
            <EmptyState tab="revisions" onRefresh={refetch} isLoading={false} />
          ) : (
            <div className="space-y-4">
              {revisions.map((rev) => (
                <RevisionCard
                  key={rev.leadId}
                  revision={rev}
                  onRevise={() => navigate(`/technician/job/${rev.leadId}`)}
                />
              ))}
            </div>
          )
        ) : isLoading ? (
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
                {activeTab !== 'today' && activeTab !== 'revisions' && (
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
