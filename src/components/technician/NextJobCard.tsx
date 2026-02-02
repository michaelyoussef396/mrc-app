interface NextJobCardProps {
  customerName: string;
  timeSlot: string;
  address: string;
  jobType: string;
  area?: string;
  travelTime?: number;
  onStartInspection: () => void;
  onGetDirections: () => void;
}

export default function NextJobCard({
  customerName,
  timeSlot,
  address,
  jobType,
  area,
  travelTime = 12,
  onStartInspection,
  onGetDirections,
}: NextJobCardProps) {
  return (
    <section className="px-4 py-4 w-full max-w-lg mx-auto">
      <div
        className="bg-white rounded-xl overflow-hidden p-5 flex flex-col gap-5 relative"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <span
              className="inline-flex items-center text-xs font-bold tracking-wider uppercase px-2 py-1 rounded"
              style={{ color: '#007AFF', backgroundColor: 'rgba(0, 122, 255, 0.1)' }}
            >
              Next Up
            </span>
            <h2 className="text-2xl font-bold mt-1" style={{ color: '#1d1d1f' }}>
              {customerName}
            </h2>
          </div>
          {/* Placeholder for customer photo */}
          <div className="w-16 h-16 rounded-lg bg-gray-200" />
        </div>

        {/* Details */}
        <div className="flex flex-col gap-3">
          {/* Time */}
          <div className="flex items-center gap-3" style={{ color: '#86868b' }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: '#007AFF' }}
            >
              schedule
            </span>
            <span className="text-base font-medium">{timeSlot}</span>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3" style={{ color: '#86868b' }}>
            <span
              className="material-symbols-outlined mt-0.5"
              style={{ fontSize: '20px', color: '#007AFF' }}
            >
              location_on
            </span>
            <div className="flex flex-col">
              <span className="text-base font-medium leading-snug">{address}</span>
              <span className="text-xs text-gray-400 mt-0.5">
                {area ? `${area} • ` : ''}{jobType}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-1">
          {/* Primary Action - Start Inspection */}
          <button
            onClick={onStartInspection}
            className="flex w-full cursor-pointer items-center justify-center rounded-xl px-6 text-white text-lg font-bold transition-colors"
            style={{
              height: '56px',
              minHeight: '56px',
              backgroundColor: '#007AFF',
              boxShadow: '0 4px 12px rgba(0, 122, 255, 0.2)',
            }}
          >
            <span>Start Inspection</span>
          </button>

          {/* Secondary Action - Get Directions */}
          <button
            onClick={onGetDirections}
            className="flex w-full cursor-pointer items-center justify-center rounded-xl px-6 gap-2 text-sm font-semibold transition-colors"
            style={{
              height: '48px',
              minHeight: '48px',
              backgroundColor: '#f0f2f4',
              color: '#1d1d1f',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: '#007AFF' }}
            >
              directions
            </span>
            <span>Get Directions ({travelTime} min)</span>
          </button>
        </div>
      </div>
    </section>
  );
}
