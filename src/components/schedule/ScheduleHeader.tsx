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
      {/* Left: Navigation */}
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

      {/* Right: Technician Filter Pills */}
      <div className="flex gap-2">
        {/* "All" button */}
        <button
          onClick={() => onTechnicianChange(null)}
          className={`flex h-8 items-center gap-x-2 rounded-xl px-4 transition-all ${
            selectedTechnician === null
              ? 'bg-[#007AFF] text-white hover:brightness-110'
              : 'border bg-transparent hover:bg-gray-50'
          }`}
          style={{
            borderColor: selectedTechnician === null ? undefined : '#e5e5e5',
          }}
        >
          <span className="text-sm font-medium">All</span>
          {selectedTechnician === null && (
            <span className="material-symbols-outlined text-[18px]">check</span>
          )}
        </button>

        {/* Technician buttons */}
        {technicians.map((tech) => (
          <button
            key={tech.id}
            onClick={() =>
              onTechnicianChange(selectedTechnician === tech.id ? null : tech.id)
            }
            className={`flex h-8 items-center gap-x-2 rounded-xl px-4 transition-all ${
              selectedTechnician === tech.id
                ? 'text-white hover:brightness-110'
                : 'border bg-transparent hover:bg-gray-50'
            }`}
            style={{
              backgroundColor: selectedTechnician === tech.id ? tech.color : undefined,
              borderColor: selectedTechnician === tech.id ? undefined : '#e5e5e5',
              color: selectedTechnician === tech.id ? 'white' : '#1d1d1f',
            }}
          >
            <span className="text-sm font-medium">{tech.name}</span>
            {selectedTechnician === tech.id && (
              <span className="material-symbols-outlined text-[18px]">close</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ScheduleHeader;
