import { TechnicianDetail } from '@/hooks/useTechnicianDetail';

interface TechnicianProfileHeaderProps {
  technician: TechnicianDetail;
}

export function TechnicianProfileHeader({ technician }: TechnicianProfileHeaderProps) {
  // Calculate background color with low opacity for initials circle
  const getInitialsBackground = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-6"
      style={{ border: '1px solid #e5e5e5' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Initials Circle */}
        <div
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shrink-0 mx-auto sm:mx-0"
          style={{ backgroundColor: getInitialsBackground(technician.color) }}
        >
          <span
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: technician.color }}
          >
            {technician.initials}
          </span>
        </div>

        {/* Info Section */}
        <div className="flex-1 text-center sm:text-left">
          {/* Name */}
          <h2
            className="text-xl sm:text-2xl font-bold leading-tight"
            style={{ color: '#1d1d1f' }}
          >
            {technician.fullName}
          </h2>

          {/* Contact Info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-2">
            {technician.email && (
              <span className="text-sm" style={{ color: '#617589' }}>
                {technician.email}
              </span>
            )}
            {technician.phone && technician.email && (
              <span className="hidden sm:inline text-gray-300">•</span>
            )}
            {technician.phone && (
              <a
                href={`tel:${technician.phone}`}
                className="text-sm hover:underline"
                style={{ color: '#007AFF' }}
              >
                {technician.phone}
              </a>
            )}
          </div>

          {/* Location */}
          {(technician.homeAddress || technician.homeSuburb) && (
            <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '16px', color: '#617589' }}
              >
                location_on
              </span>
              <span className="text-sm" style={{ color: '#617589' }}>
                {technician.homeAddress || `Based in ${technician.homeSuburb}`}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-center sm:justify-start gap-3 mt-4">
            {technician.phone && (
              <a
                href={`tel:${technician.phone}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]"
                style={{
                  border: '1px solid #e5e5e5',
                  color: '#1d1d1f',
                  backgroundColor: 'white',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f7f8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '18px', color: '#34C759' }}
                >
                  call
                </span>
                Call
              </a>
            )}
            {technician.email && (
              <a
                href={`mailto:${technician.email}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors min-h-[44px]"
                style={{ backgroundColor: '#007AFF' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0066DD';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#007AFF';
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '18px' }}
                >
                  mail
                </span>
                Email
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TechnicianProfileHeader;
