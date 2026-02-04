import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { TechnicianProfileHeader } from '@/components/technicians/TechnicianProfileHeader';
import { TechnicianStatsGrid } from '@/components/technicians/TechnicianStatsGrid';
import { WorkloadBreakdown } from '@/components/technicians/WorkloadBreakdown';
import { UpcomingBookingsList } from '@/components/technicians/UpcomingBookingsList';
import { useTechnicianDetail, useUpcomingJobs } from '@/hooks/useTechnicianDetail';

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ProfileHeaderSkeleton() {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-6 animate-pulse"
      style={{ border: '1px solid #e5e5e5' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 mx-auto sm:mx-0" />
        <div className="flex-1 text-center sm:text-left">
          <div className="h-7 w-40 bg-gray-200 rounded mx-auto sm:mx-0 mb-3" />
          <div className="h-4 w-56 bg-gray-200 rounded mx-auto sm:mx-0 mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded mx-auto sm:mx-0 mb-4" />
          <div className="flex gap-3 justify-center sm:justify-start">
            <div className="h-10 w-20 bg-gray-200 rounded-xl" />
            <div className="h-10 w-20 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-5 animate-pulse"
          style={{ border: '1px solid #e5e5e5' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-200" />
            <div className="flex-1">
              <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-7 w-12 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkloadSkeleton() {
  return (
    <div
      className="bg-white rounded-2xl p-6 animate-pulse"
      style={{ border: '1px solid #e5e5e5' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="h-5 w-36 bg-gray-200 rounded" />
        <div className="h-6 w-24 bg-gray-200 rounded-full" />
      </div>
      <div className="h-4 w-full bg-gray-200 rounded-full mb-4" />
      <div className="flex gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-200" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-12 text-center"
      style={{ border: '1px solid #e5e5e5' }}
    >
      <div
        className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)' }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '40px', color: '#FF3B30' }}
        >
          error
        </span>
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: '#1d1d1f' }}>
        Failed to Load Technician
      </h3>
      <p className="text-sm max-w-sm mx-auto mb-4" style={{ color: '#617589' }}>
        {error || 'An unexpected error occurred while loading the technician details.'}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-[#007AFF] text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

// ============================================================================
// NOT FOUND STATE
// ============================================================================

function NotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-12 text-center"
      style={{ border: '1px solid #e5e5e5' }}
    >
      <div
        className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)' }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '40px', color: '#FF9500' }}
        >
          person_off
        </span>
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: '#1d1d1f' }}>
        Technician Not Found
      </h3>
      <p className="text-sm max-w-sm mx-auto mb-4" style={{ color: '#617589' }}>
        The technician you're looking for doesn't exist or may have been removed from the system.
      </p>
      <button
        onClick={onBack}
        className="px-4 py-2 bg-[#007AFF] text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
      >
        Back to Technicians
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminTechnicianDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    data: technician,
    isLoading: techLoading,
    error: techError,
    refetch: refetchTechnician,
  } = useTechnicianDetail(id);

  const {
    data: upcomingJobs = [],
    isLoading: jobsLoading,
  } = useUpcomingJobs(id);

  const handleBack = () => {
    navigate('/admin/technicians');
  };

  const isLoading = techLoading;
  const hasError = !!techError;
  const notFound = !isLoading && !hasError && !technician;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#f5f7f8',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="ml-0 lg:ml-[260px] min-h-screen">
        {/* Page Header */}
        <header
          className="bg-white sticky top-0 z-30"
          style={{ borderBottom: '1px solid #e5e5e5' }}
        >
          <div className="flex items-center px-4 md:px-6 lg:px-8 py-4">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors mr-2"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ color: '#1d1d1f' }}>
                menu
              </span>
            </button>

            {/* Back Button */}
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3"
              title="Back to Technicians"
            >
              <span className="material-symbols-outlined" style={{ color: '#1d1d1f' }}>
                arrow_back
              </span>
            </button>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <h1
                className="text-lg sm:text-xl font-bold leading-tight truncate"
                style={{ color: '#1d1d1f' }}
              >
                {isLoading ? 'Loading...' : technician?.fullName || 'Technician Details'}
              </h1>
              {!isLoading && technician?.homeSuburb && (
                <p className="text-sm hidden sm:block" style={{ color: '#617589' }}>
                  Based in {technician.homeSuburb}
                </p>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => refetchTechnician()}
              disabled={isLoading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <span
                className={`material-symbols-outlined ${isLoading ? 'animate-spin' : ''}`}
                style={{ color: '#617589' }}
              >
                refresh
              </span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
          {/* Loading State */}
          {isLoading && (
            <>
              <ProfileHeaderSkeleton />
              <StatsGridSkeleton />
              <WorkloadSkeleton />
            </>
          )}

          {/* Error State */}
          {!isLoading && hasError && (
            <ErrorState
              error={(techError as Error).message}
              onRetry={() => refetchTechnician()}
            />
          )}

          {/* Not Found State */}
          {notFound && <NotFoundState onBack={handleBack} />}

          {/* Main Content */}
          {!isLoading && !hasError && technician && (
            <>
              {/* Profile Header */}
              <TechnicianProfileHeader technician={technician} />

              {/* Stats Grid */}
              <TechnicianStatsGrid
                inspectionsToday={technician.inspectionsToday}
                inspectionsThisWeek={technician.inspectionsThisWeek}
                inspectionsThisMonth={technician.inspectionsThisMonth}
                revenueThisMonth={technician.revenueThisMonth}
              />

              {/* Workload Breakdown */}
              <WorkloadBreakdown
                scheduled={technician.workloadScheduled}
                inProgress={technician.workloadInProgress}
                completed={technician.workloadCompleted}
                cancelled={technician.workloadCancelled}
              />

              {/* Upcoming Jobs */}
              <UpcomingBookingsList
                bookings={upcomingJobs}
                isLoading={jobsLoading}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
