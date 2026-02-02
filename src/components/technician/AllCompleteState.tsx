import { useNavigate } from 'react-router-dom';
import { Job } from './JobsList';

interface AllCompleteStateProps {
  completedJobs: Job[];
  totalJobs: number;
}

export default function AllCompleteState({ completedJobs, totalJobs }: AllCompleteStateProps) {
  const navigate = useNavigate();

  return (
    <main className="flex flex-col gap-5 p-4">
      {/* Success Banner */}
      <section className="w-full">
        <div
          className="relative overflow-hidden rounded-xl p-6 text-center"
          style={{
            background: 'linear-gradient(to bottom right, rgba(52, 199, 89, 0.1), white)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid rgba(52, 199, 89, 0.2)',
          }}
        >
          {/* Decorative blurs */}
          <div
            className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl"
            style={{ backgroundColor: 'rgba(52, 199, 89, 0.2)' }}
          />
          <div
            className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-3xl"
            style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)' }}
          />

          <div className="relative z-10 flex flex-col items-center justify-center gap-3">
            {/* Check Icon */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-sm"
              style={{ backgroundColor: 'rgba(52, 199, 89, 0.15)' }}
            >
              <span
                className="material-symbols-outlined text-4xl"
                style={{ color: '#34C759' }}
              >
                check_circle
              </span>
            </div>

            {/* Text */}
            <div className="space-y-1">
              <h1 className="text-xl font-bold" style={{ color: '#1d1d1f' }}>
                Great work!
              </h1>
              <p
                className="text-sm max-w-[260px] mx-auto leading-relaxed"
                style={{ color: '#86868b' }}
              >
                All done for today. Your logs have been synced.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Completed Jobs List */}
      <section className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <h3
            className="text-lg font-bold tracking-tight"
            style={{ color: '#1d1d1f' }}
          >
            Today's Jobs ({completedJobs.length}/{totalJobs})
          </h3>
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgba(52, 199, 89, 0.15)', color: '#34C759' }}
          >
            100% Done
          </span>
        </div>

        {/* Job Cards */}
        {completedJobs.map((job) => (
          <div
            key={job.id}
            className="group flex flex-col bg-white rounded-xl p-4 transition-transform active:scale-[0.99]"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex gap-3.5 items-start">
                {/* Check Icon */}
                <div
                  className="shrink-0 flex items-center justify-center rounded-lg w-10 h-10"
                  style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', color: '#34C759' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    check
                  </span>
                </div>

                {/* Job Details */}
                <div className="flex flex-col">
                  <h4
                    className="text-sm font-bold leading-tight"
                    style={{ color: '#1d1d1f' }}
                  >
                    {job.customerName} - {job.jobType}
                  </h4>
                  <p className="text-xs mt-1" style={{ color: '#86868b' }}>
                    {job.address || job.area}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{ backgroundColor: 'rgba(52, 199, 89, 0.15)', color: '#34C759' }}
                    >
                      COMPLETED
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="mt-4 pt-3 flex items-center justify-between"
              style={{ borderTop: '1px solid #f5f7f8' }}
            >
              <p
                className="text-xs font-medium line-through"
                style={{ color: '#86868b', textDecorationColor: 'rgba(52, 199, 89, 0.5)' }}
              >
                {job.time}
              </p>
              <button
                onClick={() => navigate(`/inspection/${job.id}/report`)}
                className="flex items-center gap-1 text-xs font-bold px-3 py-2 -mr-2 rounded-lg hover:bg-blue-50 transition-colors"
                style={{ color: '#007AFF', minHeight: '48px' }}
              >
                <span>View Report</span>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
