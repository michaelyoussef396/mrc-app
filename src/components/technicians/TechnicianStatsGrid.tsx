import { formatRevenue } from '@/hooks/useTechnicianStats';

interface TechnicianStatsGridProps {
  inspectionsToday: number;
  inspectionsThisWeek: number;
  inspectionsThisMonth: number;
  revenueThisMonth: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  iconColor: string;
  iconBg: string;
}

function StatCard({ label, value, icon, iconColor, iconBg }: StatCardProps) {
  return (
    <div
      className="bg-white rounded-2xl p-4 sm:p-5 transition-all hover:shadow-md"
      style={{ border: '1px solid #e5e5e5' }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '22px', color: iconColor }}
          >
            {icon}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className="text-xs sm:text-sm font-medium uppercase tracking-wide"
            style={{ color: '#617589' }}
          >
            {label}
          </p>
          <p
            className="text-xl sm:text-2xl font-bold mt-0.5 truncate"
            style={{ color: '#1d1d1f' }}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TechnicianStatsGrid({
  inspectionsToday,
  inspectionsThisWeek,
  inspectionsThisMonth,
  revenueThisMonth,
}: TechnicianStatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Today"
        value={inspectionsToday}
        icon="event_available"
        iconColor="#007AFF"
        iconBg="rgba(0, 122, 255, 0.1)"
      />
      <StatCard
        label="This Week"
        value={inspectionsThisWeek}
        icon="date_range"
        iconColor="#AF52DE"
        iconBg="rgba(175, 82, 222, 0.1)"
      />
      <StatCard
        label="This Month"
        value={inspectionsThisMonth}
        icon="calendar_month"
        iconColor="#FF9500"
        iconBg="rgba(255, 149, 0, 0.1)"
      />
      <StatCard
        label="Revenue"
        value={formatRevenue(revenueThisMonth)}
        icon="payments"
        iconColor="#34C759"
        iconBg="rgba(52, 199, 89, 0.1)"
      />
    </div>
  );
}

export default TechnicianStatsGrid;
