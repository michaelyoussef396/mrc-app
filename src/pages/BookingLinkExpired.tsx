import Logo from '@/components/Logo';

export const BookingLinkExpired = () => {
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
        <div className="w-full max-w-[600px] bg-white rounded-3xl shadow-2xl p-8 md:p-12 animate-fade-in">
          {/* Warning Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
              <span className="text-5xl">⚠️</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-center text-red-600 mb-4">
            Booking Link Expired
          </h1>

          {/* Message */}
          <p className="text-center text-gray-700 text-lg mb-4">
            This booking link has expired or is invalid.
          </p>

          <p className="text-center text-gray-500 text-sm mb-8">
            Booking links are valid for 30 days from the report date.
          </p>

          {/* Contact Section */}
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
            <p className="text-center font-semibold text-gray-800 mb-4">
              Please contact us to receive a new link:
            </p>

            <a 
              href="tel:1300665673"
              className="flex items-center justify-center gap-3 w-full bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-[#121D73] hover:bg-blue-50 transition-all duration-300 group"
            >
              <span className="text-2xl">📞</span>
              <span className="font-semibold text-gray-800 group-hover:text-[#121D73]">
                1300 665 673
              </span>
            </a>

            <a 
              href="mailto:info@mrc.com.au"
              className="flex items-center justify-center gap-3 w-full bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-[#121D73] hover:bg-blue-50 transition-all duration-300 group"
            >
              <span className="text-2xl">📧</span>
              <span className="font-semibold text-gray-800 group-hover:text-[#121D73]">
                info@mrc.com.au
              </span>
            </a>
          </div>

          {/* Additional Help */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Our team is available Monday - Sunday, 7:00 AM - 7:00 PM AEDT
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
