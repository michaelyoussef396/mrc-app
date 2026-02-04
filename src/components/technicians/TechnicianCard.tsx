import { useNavigate } from 'react-router-dom';
import { TechnicianWithStats, formatRevenue, formatLastSeen } from '@/hooks/useTechnicianStats';

interface TechnicianCardProps {
  technician: TechnicianWithStats;
}

export function TechnicianCard({ technician }: TechnicianCardProps) {
  const navigate = useNavigate();

  // Calculate background color with low opacity for initials circle
  const getInitialsBackground = (color: string) => {
    // Convert hex to rgba with 0.15 opacity
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-5 transition-all hover:shadow-md"
      style={{ border: '1px solid #e5e5e5' }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        {/* Initials Circle */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: getInitialsBackground(technician.color) }}
        >
          <span
            className="text-xl font-bold"
            style={{ color: technician.color }}
          >
            {technician.initials}
          </span>
        </div>

        {/* Name and Location */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3
              className="text-lg font-bold leading-tight truncate"
              style={{ color: '#1d1d1f' }}
            >
              {technician.fullName}
            </h3>
            <button
              onClick={() => navigate(`/admin/technicians/${technician.id}`)}
              className="bg-[#007AFF] text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-blue-600 transition-colors shrink-0"
            >
              View Profile
            </button>
          </div>

          {/* Location */}
          {technician.homeSuburb && (
            <p className="text-sm mt-0.5" style={{ color: '#617589' }}>
              Based in {technician.homeSuburb}
            </p>
          )}

          {/* Phone - clickable */}
          {technician.phone && (
            <a
              href={`tel:${technician.phone}`}
              className="text-sm mt-1 hover:underline"
              style={{ color: '#007AFF' }}
              onClick={(e) => e.stopPropagation()}
            >
              {technician.phone}
            </a>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div
        className="grid grid-cols-3 gap-2 divide-x divide-gray-100 border-t border-b border-gray-100 py-4"
      >
        {/* Inspections This Week */}
        <div className="flex flex-col items-center px-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider mb-1"
            style={{ color: '#617589' }}
          >
            Inspections
          </span>
          <span
            className="text-xl font-bold"
            style={{ color: '#1d1d1f' }}
          >
            {technician.inspectionsThisWeek}
          </span>
        </div>

        {/* Upcoming */}
        <div className="flex flex-col items-center px-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider mb-1"
            style={{ color: '#617589' }}
          >
            Upcoming
          </span>
          <span
            className="text-xl font-bold"
            style={{ color: '#1d1d1f' }}
          >
            {technician.upcomingCount}
          </span>
        </div>

        {/* Revenue This Month */}
        <div className="flex flex-col items-center px-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider mb-1"
            style={{ color: '#617589' }}
          >
            Revenue
          </span>
          <span
            className="text-xl font-bold"
            style={{ color: '#1d1d1f' }}
          >
            {formatRevenue(technician.revenueThisMonth)}
          </span>
        </div>
      </div>

      {/* Footer - Last Seen */}
      <div className="flex items-center gap-2 text-xs font-medium" style={{ color: '#617589' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
          schedule
        </span>
        <span>Last seen: {formatLastSeen(technician.lastSignInAt)}</span>
      </div>
    </div>
  );
}

export default TechnicianCard;
