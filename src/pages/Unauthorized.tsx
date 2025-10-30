import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col p-6" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}>
      
      {/* Simple Header */}
      <div className="flex items-center gap-3 p-4 bg-white/15 backdrop-blur-md rounded-2xl w-fit mx-auto">
        <Logo size="medium" />
        <span className="text-white text-lg font-bold">Mould & Restoration Co.</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full py-12 px-6">
        
        {/* Lock Icon/Illustration */}
        <div className="mb-12">
          <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white/95 rounded-[32px] flex flex-col items-center justify-center shadow-2xl animate-shake">
            <span className="text-5xl sm:text-6xl mb-2">🔒</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-red-600 tracking-wider">403</div>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 drop-shadow-lg">
            Access Denied
          </h1>
          
          <p className="text-lg text-white/95 leading-relaxed mb-3 font-semibold">
            You don't have permission to access this page.
          </p>
          
          <p className="text-base text-white/80 font-medium">
            This area is restricted to authorized personnel only.
          </p>
        </div>

        {/* Possible Reasons */}
        <div className="w-full max-w-lg bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 sm:p-8 mb-10">
          <h3 className="text-lg font-bold text-white mb-5 text-center">Why am I seeing this?</h3>
          <ul className="space-y-0">
            <li className="flex items-start gap-3 py-4 border-b border-white/15">
              <span className="text-2xl flex-shrink-0">🔑</span>
              <span className="text-white/90 text-[15px] font-medium leading-relaxed flex-1">You're not logged in</span>
            </li>
            <li className="flex items-start gap-3 py-4 border-b border-white/15">
              <span className="text-2xl flex-shrink-0">👤</span>
              <span className="text-white/90 text-[15px] font-medium leading-relaxed flex-1">Your account doesn't have the required permissions</span>
            </li>
            <li className="flex items-start gap-3 py-4">
              <span className="text-2xl flex-shrink-0">⏰</span>
              <span className="text-white/90 text-[15px] font-medium leading-relaxed flex-1">Your session has expired</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-md mb-10">
          <button 
            onClick={() => navigate('/')}
            className="w-full h-14 bg-white text-red-800 text-base font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span>🔐</span>
            <span>Sign In</span>
          </button>
          
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full h-14 bg-white/15 backdrop-blur-md text-white font-semibold border-2 border-white/30 rounded-2xl hover:bg-white/25 hover:border-white/50 transition-all duration-300"
          >
            ← Back to Home
          </button>
        </div>

        {/* Help Section */}
        <div className="text-center p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 max-w-lg w-full">
          <p className="text-white text-[15px] font-semibold mb-3">
            Need help accessing this page?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <a 
              href="tel:1300665673" 
              className="text-white text-[15px] font-bold hover:opacity-80 hover:underline transition-opacity"
            >
              📞 1300 665 673
            </a>
            <span className="hidden sm:inline text-white/60 text-sm">or</span>
            <a 
              href="mailto:info@mrc.com.au" 
              className="text-white text-[15px] font-bold hover:opacity-80 hover:underline transition-opacity"
            >
              📧 info@mrc.com.au
            </a>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Unauthorized;
