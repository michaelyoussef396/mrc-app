import { useNavigate } from 'react-router-dom';
import { TechnicianWithStats, formatRevenue, formatLastSeen } from '@/hooks/useTechnicianStats';
import { Clock } from 'lucide-react';

interface TechnicianCardProps {
  technician: TechnicianWithStats;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center px-2">
      <span
        className="text-[11px] font-semibold uppercase tracking-wider mb-1 text-center"
        style={{ color: '#617589' }}
      >
        {label}
      </span>
      <span className="text-xl font-bold" style={{ color: '#1d1d1f' }}>
        {value}
      </span>
    </div>
  );
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

      {/* Stats Row — 2x2 at 375px so four labels stay legible, 1x4 from sm up */}
      <div className="border-t border-b border-gray-100 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4">
          <Stat label="Active Leads" value={technician.activeLeads} />
          <Stat label="Inspections" value={technician.inspectionsTotal} />
          <Stat label="Upcoming" value={technician.upcomingCount} />
          <Stat label="Revenue" value={formatRevenue(technician.revenueThisMonth)} />
        </div>
        <p className="text-[11px] text-center mt-3" style={{ color: '#617589' }}>
          Inspections: all time &middot; Revenue: this month
        </p>
      </div>

      {/* Footer - Last Seen */}
      <div className="flex items-center gap-2 text-xs font-medium" style={{ color: '#617589' }}>
        <Clock className="h-4 w-4" />
        <span>Last seen: {formatLastSeen(technician.lastSignInAt)}</span>
      </div>
    </div>
  );
}

export default TechnicianCard;
