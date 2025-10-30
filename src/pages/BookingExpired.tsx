import Logo from '@/components/Logo';

export const BookingExpired = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4" 
         style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="w-full max-w-[600px] bg-white rounded-[24px] shadow-2xl p-8 md:p-12">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="medium" />
        </div>

        {/* Warning Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-4xl">⚠️</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-center text-red-600 mb-4">
          Booking Link Expired
        </h1>

        {/* Message */}
        <p className="text-center text-gray-600 text-lg mb-6">
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
            className="flex items-center justify-center gap-3 w-full bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-[#121D73] hover:bg-blue-50 transition-all duration-300"
          >
            <span className="text-2xl">📞</span>
            <span className="font-semibold text-gray-800">1300 665 673</span>
          </a>

          <a 
            href="mailto:info@mrc.com.au"
            className="flex items-center justify-center gap-3 w-full bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-[#121D73] hover:bg-blue-50 transition-all duration-300"
          >
            <span className="text-2xl">📧</span>
            <span className="font-semibold text-gray-800">info@mrc.com.au</span>
          </a>
        </div>
      </div>
    </div>
  );
};
