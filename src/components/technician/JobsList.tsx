import { useNavigate } from 'react-router-dom';

export interface Job {
  id: string;
  customerName: string;
  time: string;
  jobType: string;
  area: string;
  status: 'scheduled' | 'in_progress' | 'pending' | 'completed';
  address?: string;
}

interface JobsListProps {
  jobs: Job[];
  title?: string;
}

export default function JobsList({ jobs, title }: JobsListProps) {
  const navigate = useNavigate();

  const getStatusStyles = (status: Job['status']) => {
    switch (status) {
      case 'scheduled':
        return { bg: 'rgba(0, 122, 255, 0.1)', color: '#007AFF' };
      case 'in_progress':
        return { bg: 'rgba(255, 149, 0, 0.1)', color: '#FF9500' };
      case 'completed':
        return { bg: 'rgba(52, 199, 89, 0.1)', color: '#34C759' };
      case 'pending':
      default:
        return { bg: '#f0f2f4', color: '#86868b' };
    }
  };

  const getStatusLabel = (status: Job['status']) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const handleJobClick = (jobId: string) => {
    navigate(`/inspection/${jobId}`);
  };

  return (
    <section className="px-4 mt-2 w-full max-w-lg mx-auto">
      {title && (
        <h3
          className="text-lg font-bold leading-tight px-1 mb-3"
          style={{ color: '#1d1d1f' }}
        >
          {title}
        </h3>
      )}

      <div className="flex flex-col gap-3">
        {jobs.map((job) => {
          const statusStyles = getStatusStyles(job.status);

          return (
            <div
              key={job.id}
              className="flex flex-col bg-white p-4 rounded-xl transition-transform active:scale-[0.99]"
              style={{
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                opacity: job.status === 'pending' ? 0.9 : 1,
              }}
            >
              {/* Top Row - Time & Status */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px', color: '#86868b' }}
                  >
                    schedule
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: '#1d1d1f' }}
                  >
                    {job.time}
                  </span>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: statusStyles.bg,
                    color: statusStyles.color,
                  }}
                >
                  {getStatusLabel(job.status)}
                </span>
              </div>

              {/* Bottom Row - Name, Type & Action */}
              <div className="flex justify-between items-end">
                <div>
                  <p
                    className="text-base font-bold"
                    style={{ color: '#1d1d1f' }}
                  >
                    {job.customerName}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: '#86868b' }}>
                    {job.jobType} • {job.area}
                  </p>
                </div>
                <button
                  onClick={() => handleJobClick(job.id)}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
                  style={{ minWidth: '48px', minHeight: '48px' }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '20px', color: '#86868b' }}
                  >
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
