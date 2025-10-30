import { useNavigate } from 'react-router-dom';
import PublicNav from '@/components/PublicNav';

const InspectionSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <PublicNav />

      {/* Success Section */}
      <section className="flex items-center justify-center py-16 px-6">
        <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center animate-slideInUp">
          
          {/* Animated Success Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-[120px] h-[120px] rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl animate-pulse">
              <svg className="w-20 h-20 text-white" viewBox="0 0 52 52">
                <circle 
                  className="checkmark-circle" 
                  cx="26" 
                  cy="26" 
                  r="25" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  strokeDasharray="166"
                  strokeDashoffset="166"
                  style={{
                    animation: 'drawCircle 0.6s ease-out forwards'
                  }}
                />
                <path 
                  className="checkmark-check" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.1 27.2l7.1 7.2 16.7-16.8"
                  strokeDasharray="48"
                  strokeDashoffset="48"
                  style={{
                    animation: 'drawCheck 0.6s 0.3s ease-out forwards'
                  }}
                />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Request Received!
          </h1>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12">
            Thank you for contacting Mould & Restoration Co. We've received your inspection request and will be in touch shortly.
          </p>

          {/* Confirmation Details Card */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 mb-8 text-left">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">What's Next?</h3>
            
            <div className="space-y-6">
              {[
                { active: true, title: '✓ Request Received', time: 'Just now' },
                { active: false, title: 'Team Review', time: 'Within 2 hours' },
                { active: false, title: 'Confirmation Call', time: 'Same business day' },
                { active: false, title: 'Inspection Scheduled', time: 'At your convenience' }
              ].map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1.5 ${
                    step.active ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <div className="flex-1">
                    <h4 className={`font-bold ${step.active ? 'text-gray-900' : 'text-gray-600'}`}>
                      {step.title}
                    </h4>
                    <p className="text-sm text-gray-500">{step.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-8">
            <p className="font-semibold text-gray-900 mb-4">
              Need immediate assistance?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="tel:1300665673"
                className="flex items-center justify-center gap-3 h-14 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 hover:scale-105 transform transition-all duration-300"
              >
                <span>📞</span>
                <span>Call: 1300 665 673</span>
              </a>
              <a
                href="mailto:info@mrc.com.au"
                className="flex items-center justify-center gap-3 h-14 bg-white border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 hover:scale-105 transform transition-all duration-300"
              >
                <span>📧</span>
                <span>Email Us</span>
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-8 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all"
            >
              ← Back to Home
            </button>
            <button
              onClick={() => navigate('/request-inspection')}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:scale-105 transform transition-all"
            >
              Submit Another Request
            </button>
          </div>

          {/* Business Hours Info */}
          <div className="mt-8 pt-8 border-t">
            <p className="text-sm text-gray-500">
              Our team is available Monday - Sunday, 7:00 AM - 7:00 PM AEDT
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InspectionSuccess;
