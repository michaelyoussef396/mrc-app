interface WorkloadBreakdownProps {
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

interface LegendItemProps {
  color: string;
  label: string;
  count: number;
  percentage: number;
}

function LegendItem({ color, label, count, percentage }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm" style={{ color: '#617589' }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: '#1d1d1f' }}>
        {count}
      </span>
      <span className="text-xs" style={{ color: '#617589' }}>
        ({percentage}%)
      </span>
    </div>
  );
}

export function WorkloadBreakdown({
  scheduled,
  inProgress,
  completed,
  cancelled,
}: WorkloadBreakdownProps) {
  const total = scheduled + inProgress + completed + cancelled;

  // Calculate percentages
  const getPercentage = (value: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const scheduledPct = getPercentage(scheduled);
  const inProgressPct = getPercentage(inProgress);
  const completedPct = getPercentage(completed);
  const cancelledPct = getPercentage(cancelled);

  // Colors
  const colors = {
    scheduled: '#007AFF',
    inProgress: '#FF9500',
    completed: '#34C759',
    cancelled: '#8E8E93',
  };

  return (
    <div
      className="bg-white rounded-2xl p-5 sm:p-6"
      style={{ border: '1px solid #e5e5e5' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold" style={{ color: '#1d1d1f' }}>
          Workload Breakdown
        </h3>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: '#f5f7f8', color: '#617589' }}
        >
          Last 30 Days
        </span>
      </div>

      {/* Stacked Bar */}
      {total > 0 ? (
        <>
          <div className="h-4 rounded-full overflow-hidden flex bg-gray-100">
            {scheduledPct > 0 && (
              <div
                className="h-full transition-all"
                style={{
                  width: `${scheduledPct}%`,
                  backgroundColor: colors.scheduled,
                }}
              />
            )}
            {inProgressPct > 0 && (
              <div
                className="h-full transition-all"
                style={{
                  width: `${inProgressPct}%`,
                  backgroundColor: colors.inProgress,
                }}
              />
            )}
            {completedPct > 0 && (
              <div
                className="h-full transition-all"
                style={{
                  width: `${completedPct}%`,
                  backgroundColor: colors.completed,
                }}
              />
            )}
            {cancelledPct > 0 && (
              <div
                className="h-full transition-all"
                style={{
                  width: `${cancelledPct}%`,
                  backgroundColor: colors.cancelled,
                }}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
            <LegendItem
              color={colors.scheduled}
              label="Scheduled"
              count={scheduled}
              percentage={scheduledPct}
            />
            <LegendItem
              color={colors.inProgress}
              label="In Progress"
              count={inProgress}
              percentage={inProgressPct}
            />
            <LegendItem
              color={colors.completed}
              label="Completed"
              count={completed}
              percentage={completedPct}
            />
            <LegendItem
              color={colors.cancelled}
              label="Cancelled"
              count={cancelled}
              percentage={cancelledPct}
            />
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <span
            className="material-symbols-outlined mb-2"
            style={{ fontSize: '32px', color: '#617589' }}
          >
            assignment
          </span>
          <p className="text-sm" style={{ color: '#617589' }}>
            No workload data available
          </p>
        </div>
      )}
    </div>
  );
}

export default WorkloadBreakdown;
