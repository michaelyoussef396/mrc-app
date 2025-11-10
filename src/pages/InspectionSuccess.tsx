import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';

const InspectionSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    name: string;
    address: string;
    dates: Date[];
    description: string;
    refNumber: string;
  } | null;

  const firstName = state?.name?.split(' ')[0] || 'Valued Customer';

  return (
    <div 
      className="min-h-screen"
      style={{
        background: 'linear-gradient(to bottom, #EFF6FF 0%, #DBEAFE 50%, #FFFFFF 100%)'
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="/src/assets/logoMRC.png" 
            alt="MRC Logo" 
            className="h-16 mx-auto"
          />
        </div>

        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div 
            className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center"
            style={{ boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)' }}
          >
            <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Thank You, {firstName}!
          </h1>
          <p className="text-xl text-gray-600">
            Your Inspection Request Has Been Received
          </p>
        </div>

        {/* Main Card */}
        <div 
          className="bg-white rounded-xl p-6 md:p-10 mb-8"
          style={{ boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}
        >
          {/* Reference Details */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-gray-600 mb-1">Inspection Location:</p>
            <p className="font-semibold text-gray-900 mb-3">{state?.address}</p>
            <p className="text-sm text-gray-600 mb-1">Your Reference Number:</p>
            <p className="font-bold text-blue-600 text-lg">#{state?.refNumber}</p>
          </div>

          {/* What Happens Next */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-blue-100">
              What Happens Next
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</span>
                  Confirmation Call
                </h3>
                <p className="text-gray-600 ml-10">
                  A member of the MRC team will contact you to confirm your preferred booking date and time.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">2</span>
                  Professional Inspection
                </h3>
                <p className="text-gray-600 mb-2 ml-10">
                  Our IICRC-certified technician will conduct a thorough assessment of your property, including:
                </p>
                <ul className="text-gray-600 space-y-1 ml-10 list-disc list-inside">
                  <li>Complete visual inspection of affected areas</li>
                  <li>Moisture readings and environmental testing</li>
                  <li>Identification of mould sources and causes</li>
                  <li>Photo documentation of all findings</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">3</span>
                  Comprehensive Report
                </h3>
                <p className="text-gray-600 ml-10">
                  You'll receive a comprehensive report with detailed findings, pricing options, and clear recommendations.
                </p>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div className="mb-8 bg-gray-50 rounded-lg p-6">
            <p className="font-semibold text-gray-900 mb-4">
              The inspection is <span className="text-blue-600">free of charge</span> and includes a comprehensive report with:
            </p>
            <div className="space-y-2">
              {[
                'Detailed findings and moisture readings',
                'Before photos of affected areas',
                'Treatment options with transparent pricing',
                'Clear recommendations for prevention',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Important Information */}
          <div className="border-2 border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="font-bold text-gray-900 mb-4">Important Information</h3>
            
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-900 mb-1">Operating Hours:</p>
                <p className="text-gray-600">Monday to Sunday, 7am to 7pm</p>
              </div>

              {state?.dates && state.dates.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-900 mb-2">Your Preferred Dates:</p>
                  <ul className="text-gray-600 space-y-1">
                    {state.dates.map((date, i) => (
                      <li key={i}>• {format(new Date(date), 'EEEE, dd/MM/yyyy')}</li>
                    ))}
                  </ul>
                </div>
              )}

              {state?.description && (
                <div>
                  <p className="font-semibold text-gray-900 mb-2">Issue Description:</p>
                  <p className="text-gray-600 italic">"{state.description}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Need to Make Changes */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="font-bold text-gray-900 mb-3">Need to Make Changes?</h3>
            <p className="text-gray-600 mb-4">
              If you need to update your booking details or have any questions before the inspection, please contact us:
            </p>
            <div className="space-y-2">
              <p className="font-semibold text-gray-900">
                📞 Phone: <a href="tel:1800954117" className="text-blue-600 hover:underline">1800 954 117</a>
              </p>
              <p className="font-semibold text-gray-900">
                ✉️ Email: <a href="mailto:admin@mouldandrestoration.com.au" className="text-blue-600 hover:underline">admin@mouldandrestoration.com.au</a>
              </p>
            </div>
          </div>

          {/* Return Button */}
          <button
            onClick={() => navigate('/')}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all"
          >
            Return to Homepage
          </button>
        </div>

        {/* Why MRC Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: '🎓', title: 'IICRC Certified', desc: 'Industry-leading standards and professional protocols' },
            { icon: '⭐', title: '5.0/5 Stars', desc: '100+ satisfied Melbourne customers' },
            { icon: '📋', title: 'Comprehensive Reports', desc: 'Detailed assessment and recommendations' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-6 text-center" style={{ boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}>
              <div className="text-4xl mb-3">{item.icon}</div>
              <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-white rounded-xl p-6 text-center mb-8" style={{ boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}>
          <p className="text-gray-600 mb-4 italic">
            We look forward to resolving your mould concerns quickly and professionally.
          </p>
          <div className="text-gray-600 text-sm">
            <p className="font-semibold text-gray-900 mb-2">Mould & Restoration Co.</p>
            <p className="mb-1">Servicing Melbourne Metro</p>
            <p className="mb-3">ABN 47 683 089 652</p>
            <p>
              📞 <a href="tel:1800954117" className="text-blue-600 hover:underline">1800 954 117</a>
              {' | '}
              ✉️ <a href="mailto:admin@mouldandrestoration.com.au" className="text-blue-600 hover:underline">admin@mouldandrestoration.com.au</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectionSuccess;
