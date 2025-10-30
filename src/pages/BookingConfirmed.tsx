import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';

export const BookingConfirmed = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#121D73] to-[#1e3a8a] sticky top-0 z-[100] shadow-md">
        <div className="flex items-center gap-4 px-6 py-4 max-w-7xl mx-auto">
          <Logo size="medium" />
          <h1 className="text-white text-xl font-bold sm:text-lg">Mould & Restoration Co.</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex items-center justify-center p-6 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-[700px] bg-white rounded-3xl shadow-2xl p-8 md:p-12 animate-fade-in">
          {/* Animated Checkmark */}
          <div className="flex justify-center mb-6">
            <div className="w-[120px] h-[120px] rounded-full bg-green-50 flex items-center justify-center animate-scale-in">
              <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg animate-pulse">
                <svg 
                  className="w-16 h-16 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" className="animate-[scale-in_0.6s_ease-out]" />
                </svg>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
            Booking Confirmed!
          </h1>

          {/* Success Message */}
          <p className="text-center text-gray-600 text-lg mb-8">
            Your remediation work has been successfully scheduled. We'll send you a confirmation email shortly with all the details.
          </p>

          {/* Booking Details Card */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 mb-8 border-2 border-blue-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📅</span>
              Booking Details
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📆</span>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Date</p>
                  <p className="text-gray-900 font-bold">Wednesday, March 19, 2025</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-2xl">⏰</span>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Time</p>
                  <p className="text-gray-900 font-bold">9:00 AM</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-2xl">🏠</span>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Location</p>
                  <p className="text-gray-900 font-bold">45 High St, Croydon VIC 3136</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-2xl">👤</span>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Client</p>
                  <p className="text-gray-900 font-bold">John Smith</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gradient-to-r from-[#121D73] to-[#1e3a8a] text-white font-bold py-4 px-8 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              View Booking Details
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-white border-2 border-gray-300 text-gray-700 font-semibold py-4 px-8 rounded-xl hover:border-[#121D73] hover:text-[#121D73] transition-all duration-300"
            >
              Return to Dashboard
            </button>
          </div>

          {/* Info Note */}
          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-center text-blue-800">
              <span className="font-semibold">What's next?</span> Our team will contact you 24 hours before the scheduled date to confirm arrival time and answer any questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
