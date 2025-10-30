import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";

const SessionExpired = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-500 to-orange-600 flex flex-col p-6">
      
      {/* Simple Header */}
      <div className="flex items-center gap-3 p-4 bg-white/15 backdrop-blur-md rounded-2xl w-fit">
        <Logo size="medium" />
        <span className="text-white text-lg font-bold">Mould & Restoration Co.</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full py-12 px-6">
        
        {/* Clock/Timer Icon */}
        <div className="mb-12">
          <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white/95 rounded-[32px] flex flex-col items-center justify-center shadow-2xl animate-pulse">
            <span className="text-5xl sm:text-6xl mb-2">⏰</span>
            <div className="text-base sm:text-lg font-bold text-orange-600 uppercase tracking-wide">Timed Out</div>
          </div>
        </div>

        {/* Message Section */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 drop-shadow-lg">
            Your Session Has Expired
          </h1>
          
          <p className="text-lg text-white/95 leading-relaxed mb-3 font-semibold">
            For your security, you've been logged out after a period of inactivity.
          </p>
          
          <p className="text-base text-white/85 font-medium">
            Simply sign in again to continue where you left off.
          </p>
        </div>

        {/* Info Card */}
        <div className="w-full max-w-lg bg-white/15 backdrop-blur-md border border-white/25 rounded-3xl p-6 sm:p-8 mb-10">
          <h3 className="text-lg font-bold text-white mb-5 text-center">Why did this happen?</h3>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 p-4 bg-white/10 rounded-xl">
              <span className="text-2xl flex-shrink-0">🔐</span>
              <span className="text-white/95 text-sm sm:text-base font-medium leading-relaxed flex-1">
                Sessions expire after 30 minutes of inactivity to protect your data
              </span>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white/10 rounded-xl">
              <span className="text-2xl flex-shrink-0">💡</span>
              <span className="text-white/95 text-sm sm:text-base font-medium leading-relaxed flex-1">
                Your work is automatically saved - nothing was lost
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-md mb-10">
          <button 
            onClick={() => navigate('/login')}
            className="w-full h-14 bg-white text-orange-600 text-base font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 hover:bg-yellow-50"
          >
            <span>🔐</span>
            <span>Sign In Again</span>
          </button>
          
          <button 
            onClick={() => navigate('/')}
            className="w-full h-14 bg-white/15 backdrop-blur-md text-white font-semibold border-2 border-white/30 rounded-2xl hover:bg-white/25 hover:border-white/50 transition-all flex items-center justify-center gap-2"
          >
            <span>←</span>
            <span>Back to Home</span>
          </button>
        </div>

        {/* Help Section */}
        <div className="text-center p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 max-w-lg w-full">
          <p className="text-white text-sm sm:text-base font-semibold mb-3">Having trouble signing in?</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <a 
              href="/forgot-password" 
              className="text-white text-sm sm:text-base font-bold hover:opacity-80 hover:underline transition-opacity"
            >
              Reset Password
            </a>
            <span className="hidden sm:inline text-white/60 text-sm">•</span>
            <a 
              href="tel:1300665673" 
              className="text-white text-sm sm:text-base font-bold hover:opacity-80 hover:underline transition-opacity"
            >
              Contact Support
            </a>
          </div>
        </div>

      </div>

    </div>
  );
};

export default SessionExpired;
