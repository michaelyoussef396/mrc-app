import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  TechnicianHeader,
  NextJobCard,
  JobsList,
  EmptyState,
  AllCompleteState,
  TechnicianBottomNav,
  Job,
} from '@/components/technician';

// Mock data for demonstration - Replace with Supabase queries
const mockJobs: Job[] = [
  {
    id: '1',
    customerName: 'John Smith',
    time: '9:00 AM - 10:30 AM',
    jobType: 'Mould Inspection',
    area: 'Springfield',
    status: 'scheduled',
    address: '123 Maple Ave, Springfield',
  },
  {
    id: '2',
    customerName: 'Sarah Connors',
    time: '11:00 AM',
    jobType: 'Mould Removal',
    area: 'Westside',
    status: 'scheduled',
    address: '456 Oak Street, Westside',
  },
  {
    id: '3',
    customerName: 'Kyle Reese',
    time: '2:00 PM',
    jobType: 'Inspection',
    area: 'Downtown',
    status: 'pending',
    address: '789 Pine Road, Downtown',
  },
];

type DashboardState = 'loading' | 'has_jobs' | 'no_jobs' | 'all_complete';

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [dashboardState, setDashboardState] = useState<DashboardState>('loading');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Get user's first name
  const userName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Technician';

  // DEV: Support ?state=no_jobs | has_jobs | all_complete for testing
  const testState = searchParams.get('state') as DashboardState | null;

  useEffect(() => {
    // Simulate loading jobs from Supabase
    const loadJobs = async () => {
      setDashboardState('loading');

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // DEV: Override state for testing if query param provided
      if (testState === 'no_jobs') {
        setJobs([]);
        setDashboardState('no_jobs');
        return;
      }

      if (testState === 'all_complete') {
        const completedJobs = mockJobs.map((job) => ({ ...job, status: 'completed' as const }));
        setJobs(completedJobs);
        setDashboardState('all_complete');
        return;
      }

      // For demo, use mock data - Replace with actual Supabase query
      // const { data, error } = await supabase.from('jobs').select('*').eq('technician_id', user?.id).eq('date', today);

      setJobs(mockJobs);

      // Determine dashboard state based on jobs
      if (mockJobs.length === 0) {
        setDashboardState('no_jobs');
      } else if (mockJobs.every((job) => job.status === 'completed')) {
        setDashboardState('all_complete');
      } else {
        setDashboardState('has_jobs');
      }
    };

    loadJobs();
  }, [user?.id, testState]);

  const handleSyncSchedule = async () => {
    setIsSyncing(true);
    // Simulate sync delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // Re-fetch jobs from Supabase
    setIsSyncing(false);
  };

  const handleStartInspection = (jobId: string) => {
    // TODO: When wired to real data, pass leadId from the job/booking
    // For now, mock data uses jobId as leadId placeholder
    navigate(`/technician/inspection?leadId=${jobId}`);
  };

  const handleGetDirections = (address: string) => {
    // Open Google Maps with the address
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  // Get next job (first non-completed job)
  const nextJob = jobs.find((job) => job.status !== 'completed');

  // Get remaining jobs (all jobs except the next one)
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
        <EmptyState onSyncSchedule={handleSyncSchedule} isLoading={isSyncing} />
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
            travelTime={12}
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
