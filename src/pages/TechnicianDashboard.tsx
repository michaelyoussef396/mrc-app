import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTechnicianJobs, TechnicianJob } from '@/hooks/useTechnicianJobs';
import { useTechnicianAlerts } from '@/hooks/useTechnicianAlerts';
import { useRevisionJobs } from '@/hooks/useRevisionJobs';
import {
  TechnicianHeader,
  NextJobCard,
  JobsList,
  EmptyState,
  AllCompleteState,
  TechnicianBottomNav,
  Job,
} from '@/components/technician';
import { AlertTriangle, ArrowRight, MapPin } from 'lucide-react';

/** Map a TechnicianJob (from Supabase) to the Job shape the UI components expect. */
function mapToJob(tj: TechnicianJob): Job {
  return {
    id: tj.id,
    leadId: tj.leadId,
    inspectionId: tj.inspectionId,
    customerName: tj.clientName,
    time: tj.time,
    jobType: tj.title || tj.eventType,
    area: tj.suburb,
    status: tj.status,
    address: tj.fullAddress,
  };
}

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { jobs: techJobs, isLoading, error, refetch } = useTechnicianJobs('today');
  const { unreadCount } = useTechnicianAlerts();
  const { revisions } = useRevisionJobs();

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

  const handleViewLead = (jobId: string) => {
    const tj = techJobMap.get(jobId);
    const leadId = tj?.leadId || jobId;
    navigate(`/technician/job/${leadId}`);
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
        hasUnread={unreadCount > 0}
        onNotificationClick={() => navigate('/technician/alerts')}
      />

      {/* Revisions Needed */}
      {revisions.length > 0 && (
        <section className="px-4 pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-bold text-amber-900">
              Revisions Needed
            </h2>
            <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-500 text-white text-xs font-semibold flex items-center justify-center">
              {revisions.length}
            </span>
          </div>
          {revisions.map((rev) => (
            <div
              key={rev.leadId}
              className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-[#1d1d1f] leading-tight">{rev.customerName}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-[#86868b]">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{rev.address}{rev.suburb && `, ${rev.suburb}`}</span>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex-shrink-0">
                  Revision
                </span>
              </div>
              {rev.sendBackNote && (
                <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                  {rev.sendBackNote}
                </p>
              )}
              <button
                onClick={() => navigate(`/technician/job/${rev.leadId}`)}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-amber-500 text-white text-sm font-bold active:scale-[0.98] transition-all"
              >
                Revise Job Completion
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          ))}
        </section>
      )}

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
            onViewLead={() => handleViewLead(nextJob.id)}
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
