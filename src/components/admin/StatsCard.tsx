interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  trend?: 'up' | 'down' | 'neutral';
}

export default function StatsCard({
  title,
  value,
  change,
  icon,
  iconBg,
  iconColor,
  trend = 'neutral',
}: StatsCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return '#34C759'; // Success green
      case 'down':
        return '#FF3B30'; // Error red
      default:
        return '#86868b'; // Muted grey
    }
  };

  return (
    <div
      className="bg-white rounded-2xl p-6 shadow-sm"
      style={{ border: '1px solid #e5e5e5' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}
        >
          <span
            className={`material-symbols-outlined ${iconColor}`}
            style={{ fontSize: '24px' }}
          >
            {icon}
          </span>
        </div>
      </div>
      <p
        className="text-sm font-medium mb-1"
        style={{ color: '#86868b' }}
      >
        {title}
      </p>
      <p
        className="text-3xl font-bold"
        style={{ color: '#1d1d1f' }}
      >
        {value}
      </p>
      {change && (
        <p
          className="text-sm mt-2"
          style={{ color: getTrendColor() }}
        >
          {change}
        </p>
      )}
    </div>
  );
}
