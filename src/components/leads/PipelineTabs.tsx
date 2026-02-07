/**
 * PipelineTabs Component
 * Horizontal scrollable status tabs for the lead pipeline
 */

interface StatusCount {
  value: string;
  label: string;
  count: number;
  dotColor: string | null;
}

interface PipelineTabsProps {
  activeStatus: string;
  onStatusChange: (status: string) => void;
  statusCounts: StatusCount[];
}

export default function PipelineTabs({
  activeStatus,
  onStatusChange,
  statusCounts,
}: PipelineTabsProps) {
  return (
    <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
      <div className="flex gap-2 min-w-max">
        {statusCounts.map((status) => {
          const isActive = activeStatus === status.value;

          return (
            <button
              key={status.value}
              onClick={() => onStatusChange(status.value)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium
                transition-all duration-200 whitespace-nowrap
                ${isActive
                  ? 'bg-slate-900 text-white shadow-apple'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }
              `}
            >
              {/* Colored dot (not shown for "All") */}
              {status.dotColor && (
                <span
                  className={`w-2 h-2 rounded-full ${status.dotColor} ${isActive ? 'opacity-100' : 'opacity-80'}`}
                  style={status.dotColor.startsWith('bg-') ? {} : { backgroundColor: 'currentColor' }}
                />
              )}

              {/* Label */}
              <span>{status.label}</span>

              {/* Count badge */}
              <span
                className={`
                  min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold
                  flex items-center justify-center
                  ${isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                  }
                `}
              >
                {status.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
