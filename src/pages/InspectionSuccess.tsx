import { useNavigate, useSearchParams } from 'react-router-dom';
import logoMRC from '@/assets/logoMRC.png';

const InspectionSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get data from query params
  const firstName = searchParams.get('name') || 'Valued Customer';
  const refNumber = searchParams.get('ref') || 'N/A';
  const submitted = searchParams.get('submitted') === 'true';

  // If not a valid submission, show message and allow manual navigation
  if (!submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Invalid Access
          </h1>
          <p className="text-gray-600 mb-6">
            This page can only be accessed after submitting an inspection request.
          </p>
          <button
            onClick={() => navigate('/request-inspection')}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Request Inspection
          </button>
        </div>
      </div>
    );
  }

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
            src={logoMRC}
            alt="Mould & Restoration Co."
            className="h-16 md:h-20 mx-auto"
          />
        </div>

        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div
            className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center"
            style={{ boxShadow: '0 10px 25px rgba(34, 197, 94, 0.3)' }}
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
            <p className="text-sm text-gray-600 mb-1">Your Reference Number:</p>
            <p className="font-bold text-blue-600 text-2xl">#{refNumber}</p>
            <p className="text-xs text-gray-500 mt-2">
              Please keep this number for your records
            </p>
          </div>

          {/* What Happens Next */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-blue-100">
              What Happens Next
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">1</span>
                  Confirmation Email
                </h3>
                <p className="text-gray-600 ml-10">
                  You'll receive a confirmation email within a few minutes with your request details.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">2</span>
                  We'll Contact You
                </h3>
                <p className="text-gray-600 ml-10">
                  Our team will review your request within 24 hours and contact you to schedule your free inspection.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">3</span>
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
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">4</span>
                  Comprehensive Report
                </h3>
                <p className="text-gray-600 ml-10">
                  You'll receive a detailed report with findings, pricing options, and clear recommendations for remediation.
                </p>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div className="mb-8 bg-gray-50 rounded-lg p-6">
            <p className="font-semibold text-gray-900 mb-4">
              The inspection is <span className="text-blue-600">100% free</span> and includes:
            </p>
            <div className="space-y-2">
              {[
                'Detailed findings and moisture readings',
                'Before photos of affected areas',
                'Treatment options with transparent pricing',
                'Clear recommendations for prevention',
                'No obligation - no hidden fees',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Need to Make Changes */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="font-bold text-gray-900 mb-3">Need to Make Changes?</h3>
            <p className="text-gray-600 mb-4">
              If you need to update your booking details or have any questions before the inspection, please contact us:
            </p>
            <div className="space-y-2">
              <p className="font-semibold text-gray-900 flex items-center gap-2">
                <span>📞</span>
                <a href="tel:1800954117" className="text-blue-600 hover:text-blue-700 hover:underline transition">
                  1800 954 117
                </a>
              </p>
              <p className="font-semibold text-gray-900 flex items-center gap-2">
                <span>✉️</span>
                <a href="mailto:admin@mouldandrestoration.com.au" className="text-blue-600 hover:text-blue-700 hover:underline transition">
                  admin@mouldandrestoration.com.au
                </a>
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Available 7 days a week, 7am - 7pm
              </p>
            </div>
          </div>

          {/* Return Button */}
          <button
            onClick={() => navigate('/')}
            className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl"
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
              📞 <a href="tel:1800954117" className="text-blue-600 hover:text-blue-700 hover:underline">1800 954 117</a>
              {' | '}
              ✉️ <a href="mailto:admin@mouldandrestoration.com.au" className="text-blue-600 hover:text-blue-700 hover:underline">admin@mouldandrestoration.com.au</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectionSuccess;
