// Card Skeleton
export const SkeletonCard = () => (
  <div className="skeleton-card glass-card">
    <div className="skeleton-header">
      <div className="skeleton skeleton-title"></div>
      <div className="skeleton skeleton-badge"></div>
    </div>
    <div className="skeleton-body">
      <div className="skeleton skeleton-text"></div>
      <div className="skeleton skeleton-text short"></div>
    </div>
  </div>
);

// Lead Card Skeleton
export const SkeletonLeadCard = () => (
  <div className="skeleton-lead-card">
    <div className="skeleton skeleton-lead-number"></div>
    <div className="skeleton skeleton-name"></div>
    <div className="skeleton skeleton-location"></div>
    <div className="skeleton skeleton-button"></div>
  </div>
);

// Dashboard Stats Skeleton
export const SkeletonStats = () => (
  <div className="skeleton-stats">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="skeleton-stat-card glass-card">
        <div className="skeleton skeleton-stat-value"></div>
        <div className="skeleton skeleton-stat-label"></div>
      </div>
    ))}
  </div>
);

// Table Row Skeleton
export const SkeletonTableRow = () => (
  <div className="skeleton-table-row">
    <div className="skeleton skeleton-table-cell"></div>
    <div className="skeleton skeleton-table-cell"></div>
    <div className="skeleton skeleton-table-cell"></div>
    <div className="skeleton skeleton-table-cell short"></div>
  </div>
);

// Calendar Event Skeleton
export const SkeletonCalendarEvent = () => (
  <div className="skeleton-calendar-event">
    <div className="skeleton skeleton-event-time"></div>
    <div className="skeleton skeleton-event-title"></div>
  </div>
);
