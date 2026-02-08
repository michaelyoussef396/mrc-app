import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTechnicianJobs, TechnicianJob } from '@/hooks/useTechnicianJobs';
import {
  TechnicianHeader,
  NextJobCard,
  JobsList,
  EmptyState,
  AllCompleteState,
  TechnicianBottomNav,
  Job,
} from '@/components/technician';

/** Map a TechnicianJob (from Supabase) to the Job shape the UI components expect. */
function mapToJob(tj: TechnicianJob): Job {
  return {
    id: tj.id,
    customerName: tj.clientName,
    time: tj.time,
    jobType: tj.title || tj.eventType,
    area: tj.suburb,
    status: tj.status === 'cancelled' ? 'scheduled' : tj.status,
    address: tj.fullAddress,
  };
}

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { jobs: techJobs, isLoading, error, refetch } = useTechnicianJobs('today');

  const userName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Technician';

  // Map Supabase data to the component Job type
  const jobs: Job[] = techJobs.map(mapToJob);

  // Build a lookup from Job id → TechnicianJob for fields the components don't carry (leadId, travelTime)
  const techJobMap = new Map(techJobs.map((tj) => [tj.id, tj]));

  // Derive dashboard state
  const dashboardState = isLoading
    ? 'loading'
    : jobs.length === 0
      ? 'no_jobs'
      : jobs.every((j) => j.status === 'completed')
        ? 'all_complete'
        : 'has_jobs';

  const handleStartInspection = (jobId: string) => {
    const tj = techJobMap.get(jobId);
    const leadId = tj?.leadId || jobId;
    navigate(`/technician/inspection?leadId=${leadId}`);
  };

  const handleGetDirections = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  // Next job = first non-completed job
  const nextJob = jobs.find((job) => job.status !== 'completed');
  const remainingJobs = nextJob ? jobs.filter((job) => job.id !== nextJob.id) : [];

  // Loading state
  if (dashboardState === 'loading') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#f5f7f8' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: '#007AFF', borderTopColor: 'transparent' }}
          />
          <p className="text-sm font-medium" style={{ color: '#86868b' }}>
            Loading your schedule...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ backgroundColor: '#f5f7f8' }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fee2e2' }}>
            <span className="text-xl">!</span>
          </div>
          <p className="text-sm font-medium" style={{ color: '#1d1d1f' }}>
            Failed to load your schedule
          </p>
          <p className="text-xs" style={{ color: '#86868b' }}>
            {error}
          </p>
          <button
            onClick={refetch}
            className="px-6 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#007AFF', minHeight: '48px' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative pb-24"
      style={{ backgroundColor: '#f5f7f8', color: '#1d1d1f' }}
    >
      {/* Header */}
      <TechnicianHeader
        userName={userName}
        onNotificationClick={() => navigate('/technician/alerts')}
      />

      {/* Main Content - Based on State */}
      {dashboardState === 'no_jobs' && (
        <EmptyState onSyncSchedule={refetch} isLoading={isLoading} />
      )}

      {dashboardState === 'all_complete' && (
        <AllCompleteState completedJobs={jobs} totalJobs={jobs.length} />
      )}

      {dashboardState === 'has_jobs' && nextJob && (
        <>
          {/* Next Job Hero Card */}
          <NextJobCard
            customerName={nextJob.customerName}
            timeSlot={nextJob.time}
            address={nextJob.address || ''}
            jobType={nextJob.jobType}
            area={nextJob.area}
            travelTime={techJobMap.get(nextJob.id)?.travelTimeMinutes ?? undefined}
            onStartInspection={() => handleStartInspection(nextJob.id)}
            onGetDirections={() => handleGetDirections(nextJob.address || '')}
          />

          {/* Remaining Jobs List */}
          {remainingJobs.length > 0 && (
            <JobsList
              jobs={remainingJobs}
              title={`Today's Jobs (${jobs.length})`}
            />
          )}
        </>
      )}

      {/* Bottom Navigation */}
      <TechnicianBottomNav />
    </div>
  );
}
