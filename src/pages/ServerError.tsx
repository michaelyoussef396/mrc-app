import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';

const ServerError = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col p-6">
      
      {/* Simple Header */}
      <div className="flex items-center gap-3 p-4 bg-white/15 backdrop-blur-md rounded-2xl w-fit">
        <Logo size="medium" />
        <span className="text-white text-lg font-bold">Mould & Restoration Co.</span>
      </div>

      {/* Main Error Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full py-12 px-6">
        
        {/* Error Icon/Illustration */}
        <div className="mb-12">
          <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white/95 rounded-[32px] flex flex-col items-center justify-center shadow-2xl animate-float">
            <span className="text-5xl sm:text-6xl mb-2">⚠️</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-red-600 tracking-wider">500</div>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 drop-shadow-lg">
            Something Went Wrong
          </h1>
          
          <p className="text-lg text-white/95 leading-relaxed mb-3">
            We're experiencing technical difficulties. Our team has been notified and is working to fix the issue.
          </p>
          
          <p className="text-base text-white/80 font-medium">
            Please try again in a few moments.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-md mb-10">
          <button 
            onClick={() => window.location.reload()}
            className="w-full h-14 bg-white text-blue-900 text-base font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span>🔄</span>
            <span>Refresh Page</span>
          </button>
          
          <button 
            onClick={() => navigate('/')}
            className="w-full h-14 bg-white/15 backdrop-blur-md text-white font-semibold border-2 border-white/30 rounded-2xl hover:bg-white/25 hover:border-white/50 transition-all duration-300"
          >
            ← Back to Home
          </button>
        </div>

        {/* Help Section */}
        <div className="text-center p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 mb-8 w-full max-w-md">
          <p className="text-white text-[15px] font-semibold mb-3">
            Need immediate assistance?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <a 
              href="tel:1300665673" 
              className="text-white text-[15px] font-bold hover:opacity-80 transition-opacity"
            >
              📞 1300 665 673
            </a>
            <span className="hidden sm:inline text-white/60 text-sm">or</span>
            <a 
              href="mailto:info@mrc.com.au" 
              className="text-white text-[15px] font-bold hover:opacity-80 transition-opacity"
            >
              📧 info@mrc.com.au
            </a>
          </div>
        </div>

        {/* Technical Details (collapsible, optional) */}
        <details className="w-full max-w-lg">
          <summary className="text-white/80 text-sm font-semibold cursor-pointer list-none text-center p-3 rounded-lg hover:bg-white/10 transition-colors">
            Technical Details
          </summary>
          <div className="mt-4 p-5 bg-white/10 rounded-xl backdrop-blur-md">
            <div className="flex justify-between py-2 border-b border-white/15">
              <span className="text-white/70 text-[13px] font-semibold">Error Code:</span>
              <span className="text-white text-[13px] font-medium font-mono">500 Internal Server Error</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/15">
              <span className="text-white/70 text-[13px] font-semibold">Timestamp:</span>
              <span className="text-white text-[13px] font-medium font-mono">{new Date().toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-white/70 text-[13px] font-semibold">Reference:</span>
              <span className="text-white text-[13px] font-medium font-mono">REF-{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
            </div>
          </div>
        </details>

      </div>

    </div>
  );
};

export default ServerError;
