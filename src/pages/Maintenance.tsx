import Logo from "@/components/Logo";
import { useEffect, useState } from "react";
import { 
  Wrench, 
  Clock, 
  Zap, 
  Shield, 
  Sparkles, 
  Phone, 
  Mail, 
  AlertCircle,
  BarChart3 
} from 'lucide-react';

const Maintenance = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Mock estimated return time (2 hours from now)
  const estimatedReturn = new Date(Date.now() + 2 * 60 * 60 * 1000);

  return (
    <div className="min-h-screen flex flex-col p-6" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)' }}>
      
      {/* Simple Header */}
      <div className="flex items-center gap-3 p-4 bg-white/15 backdrop-blur-md rounded-2xl w-fit">
        <Logo size="medium" />
        <span className="text-lg font-bold text-white">Mould & Restoration Co.</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full py-12 px-6">
        
        {/* Wrench Icon */}
        <div className="mb-12">
          <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white/95 rounded-[32px] flex flex-col items-center justify-center shadow-2xl animate-spin-slow">
            <Wrench className="w-12 h-12 sm:w-16 sm:h-16 text-sky-500 mb-3" strokeWidth={2.5} />
            <div className="text-xs sm:text-sm font-bold text-sky-500 uppercase tracking-wider bg-sky-50 px-3 py-1 rounded-full">
              Under Maintenance
            </div>
          </div>
        </div>

        {/* Message Section */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 drop-shadow-lg">
            We'll Be Back Shortly
          </h1>
          
          <p className="text-base sm:text-lg text-white/95 leading-relaxed mb-3 font-semibold">
            Our system is currently undergoing scheduled maintenance to improve your experience.
          </p>
          
          <p className="text-sm sm:text-base text-white/85 font-medium">
            Thank you for your patience while we make things better.
          </p>
        </div>

        {/* Status Card */}
        <div className="w-full bg-white/15 backdrop-blur-md border border-white/25 rounded-3xl p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="text-white" size={28} strokeWidth={2} />
            <h3 className="text-lg sm:text-xl font-bold text-white">Maintenance Status</h3>
          </div>
          
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-between items-center py-3 border-b border-white/15">
              <span className="text-white/80 text-sm sm:text-base font-semibold">Current Status:</span>
              <span className="text-white text-sm sm:text-base font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                In Progress
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-white/15">
              <span className="text-white/80 text-sm sm:text-base font-semibold">Started:</span>
              <span className="text-white text-sm sm:text-base font-bold">
                {currentTime.toLocaleTimeString('en-AU', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3">
              <span className="text-white/80 text-sm sm:text-base font-semibold">Estimated Completion:</span>
              <span className="text-amber-400 text-sm sm:text-lg font-bold flex items-center gap-2">
                <Clock className="inline-block" size={16} strokeWidth={2.5} />
                {estimatedReturn.toLocaleTimeString('en-AU', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
            </div>
          </div>
          
          <div className="mt-2">
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-progress"
                style={{ width: '60%' }}
              ></div>
            </div>
            <p className="text-center text-white/80 text-xs sm:text-sm font-semibold">
              Working on it...
            </p>
          </div>
        </div>

        {/* What's Being Updated */}
        <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-7 mb-6">
          <h3 className="text-base sm:text-lg font-bold text-white mb-5 text-center">
            What We're Working On
          </h3>
          <ul className="flex flex-col gap-3">
            <li className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/10 rounded-xl transition-all hover:bg-white/15 hover:translate-x-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}>
                <Zap size={20} strokeWidth={2.5} />
              </div>
              <span className="text-white/95 text-sm sm:text-base font-medium">
                System performance improvements
              </span>
            </li>
            <li className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/10 rounded-xl transition-all hover:bg-white/15 hover:translate-x-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                <Shield size={20} strokeWidth={2.5} />
              </div>
              <span className="text-white/95 text-sm sm:text-base font-medium">
                Security updates and patches
              </span>
            </li>
            <li className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/10 rounded-xl transition-all hover:bg-white/15 hover:translate-x-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
                <Sparkles size={20} strokeWidth={2.5} />
              </div>
              <span className="text-white/95 text-sm sm:text-base font-medium">
                New features and enhancements
              </span>
            </li>
          </ul>
        </div>

        {/* Emergency Contact */}
        <div className="w-full bg-red-500/15 backdrop-blur-md border-2 border-red-500/30 rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white animate-pulse">
              <AlertCircle size={32} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white text-center">Need Urgent Assistance?</h3>
          </div>
          <p className="text-white/95 text-sm sm:text-base text-center mb-5 font-medium">
            For emergency mould inspections or urgent issues, contact us directly:
          </p>
          <div className="flex flex-col gap-3 mb-4">
            <a 
              href="tel:1300665673" 
              className="w-full py-3 sm:py-4 px-6 bg-white text-red-600 text-sm sm:text-base font-bold rounded-xl text-center transition-all hover:-translate-y-0.5 hover:shadow-xl shadow-lg flex items-center justify-center gap-2"
            >
              <Phone size={20} strokeWidth={2.5} />
              Emergency Line: 1300 665 673
            </a>
            <a 
              href="mailto:info@mrc.com.au" 
              className="w-full py-3 sm:py-4 px-6 bg-white text-red-600 text-sm sm:text-base font-bold rounded-xl text-center transition-all hover:-translate-y-0.5 hover:shadow-xl shadow-lg flex items-center justify-center gap-2"
            >
              <Mail size={20} strokeWidth={2.5} />
              Email: info@mrc.com.au
            </a>
          </div>
          <p className="text-center text-white/80 text-xs sm:text-sm font-semibold">
            Our emergency hotline is available 24/7
          </p>
        </div>

        {/* Social Media / Updates */}
        <div className="text-center p-5">
          <p className="text-white/90 text-sm sm:text-base font-semibold mb-3">
            Follow us for real-time updates:
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a href="#" className="text-white text-sm sm:text-base font-bold hover:opacity-80 hover:underline transition-opacity">
              Twitter
            </a>
            <span className="text-white/60 text-sm">•</span>
            <a href="#" className="text-white text-sm sm:text-base font-bold hover:opacity-80 hover:underline transition-opacity">
              Facebook
            </a>
            <span className="text-white/60 text-sm">•</span>
            <a href="#" className="text-white text-sm sm:text-base font-bold hover:opacity-80 hover:underline transition-opacity">
              LinkedIn
            </a>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Maintenance;
