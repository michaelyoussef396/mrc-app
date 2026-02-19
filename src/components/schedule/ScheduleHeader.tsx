import { formatWeekRange, getWeekStart } from '@/hooks/useScheduleCalendar';

// ============================================================================
// TYPES
// ============================================================================

interface Technician {
  id: string;
  name: string;
  color: string;
}

interface ScheduleHeaderProps {
  weekStart: Date;
  onWeekChange: (newWeekStart: Date) => void;
  technicians: Technician[];
  selectedTechnician: string | null; // null = "All"
  onTechnicianChange: (technicianId: string | null) => void;
  showCancelled: boolean;
  onShowCancelledChange: (show: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduleHeader({
  weekStart,
  onWeekChange,
  technicians,
  selectedTechnician,
  onTechnicianChange,
  showCancelled,
  onShowCancelledChange,
}: ScheduleHeaderProps) {
  const handlePreviousWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    onWeekChange(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    onWeekChange(next);
  };

  const handleToday = () => {
    onWeekChange(getWeekStart(new Date()));
  };

  return (
    <div
      className="p-4 flex flex-wrap items-center justify-between gap-4 bg-white"
      style={{ borderBottom: '1px solid #e5e5e5' }}
    >
      {/* Left: Navigation (hidden when viewing cancelled) */}
      {!showCancelled && (
        <div className="flex items-center gap-3">
          <div
            className="flex rounded-xl p-1"
            style={{ backgroundColor: '#f0f2f4' }}
          >
            <button
              onClick={handlePreviousWeek}
              className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all"
              aria-label="Previous week"
            >
              <span className="material-symbols-outlined text-sm" style={{ color: '#1d1d1f' }}>
                arrow_back_ios
              </span>
            </button>
            <button
              onClick={handleToday}
              className="px-4 text-sm font-bold hover:bg-white hover:shadow-sm rounded-lg transition-all"
              style={{ color: '#1d1d1f' }}
            >
              Today
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all"
              aria-label="Next week"
            >
              <span className="material-symbols-outlined text-sm" style={{ color: '#1d1d1f' }}>
                arrow_forward_ios
              </span>
            </button>
          </div>

          <h3 className="text-lg font-bold" style={{ color: '#1d1d1f' }}>
            {formatWeekRange(weekStart)}
          </h3>
        </div>
      )}

      {showCancelled && (
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg" style={{ color: '#ef4444' }}>
            event_busy
          </span>
          <h3 className="text-lg font-bold" style={{ color: '#1d1d1f' }}>
            Cancelled Bookings
          </h3>
        </div>
      )}

      {/* Right: Technician Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {/* "All" button */}
        <button
          onClick={() => { onShowCancelledChange(false); onTechnicianChange(null); }}
          className={`flex h-8 items-center gap-x-2 rounded-xl px-4 transition-all ${
            selectedTechnician === null && !showCancelled
              ? 'bg-[#007AFF] text-white hover:brightness-110'
              : 'border bg-transparent hover:bg-gray-50'
          }`}
          style={{
            borderColor: selectedTechnician === null && !showCancelled ? undefined : '#e5e5e5',
            color: selectedTechnician === null && !showCancelled ? undefined : '#1d1d1f',
          }}
        >
          <span className="text-sm font-medium">All</span>
          {selectedTechnician === null && !showCancelled && (
            <span className="material-symbols-outlined text-[18px]">check</span>
          )}
        </button>

        {/* Technician buttons */}
        {technicians.map((tech) => (
          <button
            key={tech.id}
            onClick={() => {
              onShowCancelledChange(false);
              onTechnicianChange(selectedTechnician === tech.id ? null : tech.id);
            }}
            className={`flex h-8 items-center gap-x-2 rounded-xl px-4 transition-all ${
              selectedTechnician === tech.id && !showCancelled
                ? 'text-white hover:brightness-110'
                : 'border bg-transparent hover:bg-gray-50'
            }`}
            style={{
              backgroundColor: selectedTechnician === tech.id && !showCancelled ? tech.color : undefined,
              borderColor: selectedTechnician === tech.id && !showCancelled ? undefined : '#e5e5e5',
              color: selectedTechnician === tech.id && !showCancelled ? 'white' : '#1d1d1f',
            }}
          >
            <span className="text-sm font-medium">{tech.name}</span>
            {selectedTechnician === tech.id && !showCancelled && (
              <span className="material-symbols-outlined text-[18px]">close</span>
            )}
          </button>
        ))}

        {/* Cancelled pill */}
        <button
          onClick={() => {
            onShowCancelledChange(true);
            onTechnicianChange(null);
          }}
          className={`flex h-8 items-center gap-x-2 rounded-xl px-4 transition-all ${
            showCancelled
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'border bg-transparent hover:bg-red-50'
          }`}
          style={{
            borderColor: showCancelled ? undefined : '#e5e5e5',
            color: showCancelled ? undefined : '#ef4444',
          }}
        >
          <span className="material-symbols-outlined text-[16px]">cancel</span>
          <span className="text-sm font-medium">Cancelled</span>
        </button>
      </div>
    </div>
  );
}

export default ScheduleHeader;
