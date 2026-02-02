interface EmptyStateProps {
  onSyncSchedule: () => void;
  isLoading?: boolean;
}

export default function EmptyState({ onSyncSchedule, isLoading = false }: EmptyStateProps) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20 relative z-0">
      <div className="flex flex-col items-center justify-center w-full max-w-[320px] gap-8">
        {/* Illustration */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Background blur effect */}
          <div
            className="absolute inset-0 rounded-full blur-2xl transform scale-90"
            style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)' }}
          />

          {/* Document card illustration */}
          <div
            className="relative z-10 rounded-3xl p-6 w-32 h-40 flex flex-col items-center justify-center transform -rotate-6"
            style={{
              background: 'linear-gradient(to bottom right, white, #f5f7f8)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              border: '1px solid rgba(255,255,255,0.5)',
            }}
          >
            {/* Skeleton lines */}
            <div className="w-full h-2 bg-gray-200 rounded-full mb-3 opacity-50" />
            <div className="w-3/4 h-2 bg-gray-200 rounded-full mb-3 opacity-50 self-start" />
            <div className="w-full h-2 bg-gray-200 rounded-full mb-8 opacity-50" />

            {/* Check mark badge */}
            <div
              className="absolute bottom-4 -right-2.5 rounded-full p-2 shadow-md"
              style={{ backgroundColor: 'white', border: '4px solid #f5f7f8' }}
            >
              <span
                className="material-symbols-outlined text-3xl font-bold"
                style={{ color: '#34C759' }}
              >
                check_circle
              </span>
            </div>
          </div>

          {/* Sun icon decoration */}
          <div className="absolute top-0 right-4" style={{ color: '#007AFF', opacity: 0.6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
              wb_sunny
            </span>
          </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#1d1d1f' }}
          >
            No inspections scheduled today
          </h1>
          <p
            className="text-base max-w-[280px] leading-relaxed"
            style={{ color: '#86868b' }}
          >
            You're all clear! Enjoy the downtime or check for updates.
          </p>
        </div>

        {/* Sync Button */}
        <button
          onClick={onSyncSchedule}
          disabled={isLoading}
          className="w-full max-w-[240px] h-14 flex items-center justify-center gap-3 text-white font-bold text-base rounded-xl transition-all active:scale-95 mt-4 group disabled:opacity-70"
          style={{
            backgroundColor: '#007AFF',
            boxShadow: '0 8px 24px rgba(0, 122, 255, 0.2)',
            minHeight: '56px',
          }}
        >
          <span
            className={`material-symbols-outlined transition-transform duration-500 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`}
          >
            sync
          </span>
          <span>{isLoading ? 'Syncing...' : 'Sync Schedule'}</span>
        </button>
      </div>
    </main>
  );
}
