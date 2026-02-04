import { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import TechnicianCard from '@/components/technicians/TechnicianCard';
import { useTechnicianStats } from '@/hooks/useTechnicianStats';

// ============================================================================
// LOADING SKELETON
// ============================================================================

function TechnicianCardSkeleton() {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-5 animate-pulse"
      style={{ border: '1px solid #e5e5e5' }}
    >
      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-200" />
        <div className="flex flex-col flex-1 gap-2">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 bg-gray-200 rounded" />
            <div className="h-7 w-24 bg-gray-200 rounded-full" />
          </div>
          <div className="h-4 w-28 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-3 gap-2 border-t border-b border-gray-100 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-3 w-16 bg-gray-200 rounded" />
            <div className="h-6 w-12 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Footer Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-gray-200 rounded" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-12 text-center"
      style={{ border: '1px solid #e5e5e5' }}
    >
      <div
        className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)' }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '40px', color: '#007AFF' }}
        >
          groups
        </span>
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: '#1d1d1f' }}>
        No Technicians Found
      </h3>
      <p className="text-sm max-w-sm mx-auto" style={{ color: '#617589' }}>
        There are no technicians assigned yet. Technicians will appear here once they are added to the system with the technician role.
      </p>
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
        Failed to Load Technicians
      </h3>
      <p className="text-sm max-w-sm mx-auto mb-4" style={{ color: '#617589' }}>
        {error || 'An unexpected error occurred while loading the technicians list.'}
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
// MAIN COMPONENT
// ============================================================================

export default function AdminTechnicians() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: technicians = [], isLoading, error, refetch } = useTechnicianStats();

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
          <div className="flex items-center px-4 md:px-6 lg:px-8 py-4 justify-between">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ color: '#1d1d1f' }}>
                menu
              </span>
            </button>

            {/* Title Section */}
            <div className="flex items-center gap-4 flex-1">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)' }}
              >
                <span className="material-symbols-outlined" style={{ color: '#007AFF' }}>
                  groups
                </span>
              </div>
              <div>
                <h1
                  className="text-xl font-bold leading-tight"
                  style={{ color: '#1d1d1f' }}
                >
                  Technicians
                </h1>
                <p className="text-sm" style={{ color: '#617589' }}>
                  {isLoading
                    ? 'Loading...'
                    : `${technicians.length} team member${technicians.length === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
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
        <div className="p-4 md:p-6 lg:p-8">
          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <TechnicianCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <ErrorState
              error={(error as Error).message}
              onRetry={() => refetch()}
            />
          )}

          {/* Empty State */}
          {!isLoading && !error && technicians.length === 0 && <EmptyState />}

          {/* Technician Cards Grid */}
          {!isLoading && !error && technicians.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {technicians.map((technician) => (
                <TechnicianCard key={technician.id} technician={technician} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
