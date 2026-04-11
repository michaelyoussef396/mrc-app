import { formatWeekRange, getWeekStart } from '@/hooks/useScheduleCalendar';
import {
  CalendarX2,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  XCircle,
} from 'lucide-react';

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
  selectedDate?: Date;
  onDayChange?: (date: Date) => void;
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
  selectedDate,
  onDayChange,
}: ScheduleHeaderProps) {
  // Mobile: day navigation
  const handlePreviousDay = () => {
    if (!selectedDate || !onDayChange) return;
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    onDayChange(prev);
  };

  const handleNextDay = () => {
    if (!selectedDate || !onDayChange) return;
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    onDayChange(next);
  };

  const handleTodayDay = () => {
    if (onDayChange) onDayChange(new Date());
  };

  const formatSelectedDay = (date: Date): string =>
    date.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  // Desktop: week navigation
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

      {/* MOBILE: Day navigation */}
      {!showCancelled && selectedDate && onDayChange && (
        <div className="flex items-center gap-3 lg:hidden">
          <div
            className="flex rounded-xl p-1"
            style={{ backgroundColor: '#f0f2f4' }}
          >
            <button
              onClick={handlePreviousDay}
              className="flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all"
              style={{ minWidth: '44px', minHeight: '44px' }}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" style={{ color: '#1d1d1f' }} />
            </button>
            <button
              onClick={handleTodayDay}
              className="px-3 text-sm font-bold hover:bg-white hover:shadow-sm rounded-lg transition-all"
              style={{ color: '#1d1d1f', minHeight: '44px' }}
            >
              Today
            </button>
            <button
              onClick={handleNextDay}
              className="flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all"
              style={{ minWidth: '44px', minHeight: '44px' }}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" style={{ color: '#1d1d1f' }} />
            </button>
          </div>

          <h3 className="text-base font-bold" style={{ color: '#1d1d1f' }}>
            {formatSelectedDay(selectedDate)}
          </h3>
        </div>
      )}

      {/* DESKTOP: Week navigation */}
      {!showCancelled && (
        <div className="hidden lg:flex items-center gap-3">
          <div
            className="flex rounded-xl p-1"
            style={{ backgroundColor: '#f0f2f4' }}
          >
            <button
              onClick={handlePreviousWeek}
              className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" style={{ color: '#1d1d1f' }} />
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
              <ChevronRight className="h-4 w-4" style={{ color: '#1d1d1f' }} />
            </button>
          </div>

          <h3 className="text-lg font-bold" style={{ color: '#1d1d1f' }}>
            {formatWeekRange(weekStart)}
          </h3>
        </div>
      )}

      {showCancelled && (
        <div className="flex items-center gap-2">
          <CalendarX2 className="h-5 w-5" style={{ color: '#ef4444' }} />
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
            <Check className="h-[18px] w-[18px]" />
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
              <X className="h-[18px] w-[18px]" />
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
          <XCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Cancelled</span>
        </button>
      </div>
    </div>
  );
}

export default ScheduleHeader;
