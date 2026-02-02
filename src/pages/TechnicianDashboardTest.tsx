/**
 * TEST PAGE - For visual verification of Technician Dashboard states
 * Remove this file before production deployment
 *
 * Usage:
 * - /test/technician?state=has_jobs (default - shows next job + list)
 * - /test/technician?state=no_jobs (empty state)
 * - /test/technician?state=all_complete (all jobs completed)
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TechnicianHeader,
  NextJobCard,
  JobsList,
  EmptyState,
  AllCompleteState,
  TechnicianBottomNav,
  Job,
} from '@/components/technician';

// Mock data for demonstration
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

export default function TechnicianDashboardTest() {
  const [searchParams] = useSearchParams();
  const [dashboardState, setDashboardState] = useState<DashboardState>('loading');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const userName = 'Clayton';
  const testState = (searchParams.get('state') as DashboardState) || 'has_jobs';

  useEffect(() => {
    const loadJobs = async () => {
      setDashboardState('loading');
      await new Promise((resolve) => setTimeout(resolve, 300));

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

      setJobs(mockJobs);
      setDashboardState('has_jobs');
    };

    loadJobs();
  }, [testState]);

  const handleSyncSchedule = async () => {
    setIsSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSyncing(false);
  };

  const handleStartInspection = (jobId: string) => {
    alert(`Start Inspection for job: ${jobId}`);
  };

  const handleGetDirections = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  const nextJob = jobs.find((job) => job.status !== 'completed');
  const remainingJobs = nextJob ? jobs.filter((job) => job.id !== nextJob.id) : [];

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
      {/* Test Banner */}
      <div className="bg-yellow-100 text-yellow-800 text-xs text-center py-1 px-2">
        TEST MODE: ?state={testState} | Options: has_jobs, no_jobs, all_complete
      </div>

      <TechnicianHeader
        userName={userName}
        onNotificationClick={() => alert('Notifications clicked')}
      />

      {dashboardState === 'no_jobs' && (
        <EmptyState onSyncSchedule={handleSyncSchedule} isLoading={isSyncing} />
      )}

      {dashboardState === 'all_complete' && (
        <AllCompleteState completedJobs={jobs} totalJobs={jobs.length} />
      )}

      {dashboardState === 'has_jobs' && nextJob && (
        <>
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

          {remainingJobs.length > 0 && (
            <JobsList
              jobs={remainingJobs}
              title={`Today's Jobs (${jobs.length})`}
            />
          )}
        </>
      )}

      <TechnicianBottomNav />
    </div>
  );
}
