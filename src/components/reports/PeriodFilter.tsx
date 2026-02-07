/**
 * PeriodFilter Component
 * Pill-style time period selector for reports
 */

import { TimePeriod } from '@/hooks/useReportsData';

interface PeriodFilterProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
}

const periods: { value: TimePeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

export default function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div className="inline-flex bg-slate-100 rounded-lg p-1 gap-1">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`
            px-4 py-2 text-sm font-medium rounded-md transition-all
            ${
              value === period.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }
          `}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
