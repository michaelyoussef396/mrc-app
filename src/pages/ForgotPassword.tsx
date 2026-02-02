import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceInfo } from '@/utils/deviceFingerprint';
import { getLocationInfo } from '@/utils/ipLocation';
import logoLarge from '@/assets/logo-large.png';

// Rate limiting constants
const RESET_LIMIT = 3;
const RESET_WINDOW = 15 * 60 * 1000; // 15 minutes in ms
const RESEND_COOLDOWN = 60; // 60 seconds

// Rate limiting helper functions
const getResetAttempts = (): { count: number; firstAttempt: number | null } => {
  const data = localStorage.getItem('mrc_reset_attempts');
  if (!data) return { count: 0, firstAttempt: null };
  try {
    return JSON.parse(data);
  } catch {
    return { count: 0, firstAttempt: null };
  }
};

const recordResetAttempt = (): number => {
  const attempts = getResetAttempts();
  const now = Date.now();

  if (!attempts.firstAttempt || now - attempts.firstAttempt > RESET_WINDOW) {
    // Reset window expired - start fresh
    localStorage.setItem('mrc_reset_attempts', JSON.stringify({
      count: 1,
      firstAttempt: now
    }));
    return 1;
  }

  const newCount = attempts.count + 1;
  localStorage.setItem('mrc_reset_attempts', JSON.stringify({
    ...attempts,
    count: newCount
  }));
  return newCount;
};

const isRateLimited = (): boolean => {
  const attempts = getResetAttempts();
  if (!attempts.firstAttempt) return false;

  const now = Date.now();
  if (now - attempts.firstAttempt > RESET_WINDOW) return false;

  return attempts.count >= RESET_LIMIT;
};

const getRemainingLockoutTime = (): number => {
  const attempts = getResetAttempts();
  if (!attempts.firstAttempt) return 0;

  const elapsed = Date.now() - attempts.firstAttempt;
  const remaining = RESET_WINDOW - elapsed;
  return Math.max(0, Math.ceil(remaining / 1000 / 60)); // minutes
};

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Resend countdown state
  const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);

  // Rate limiting state
  const [isRateLimitedState, setIsRateLimitedState] = useState(false);
  const [lockoutMinutes, setLockoutMinutes] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (isSuccess && resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0) {
      setCanResend(true);
    }
  }, [isSuccess, resendCountdown]);

  // Check rate limit on mount
  useEffect(() => {
    if (isRateLimited()) {
      setIsRateLimitedState(true);
      setLockoutMinutes(getRemainingLockoutTime());
    }
  }, []);

  const validateEmail = (email: string): boolean => {
    const trimmed = email.trim();
    if (!trimmed) return false;
    if (trimmed.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check rate limiting first
    if (isRateLimited()) {
      const minutes = getRemainingLockoutTime();
      setIsRateLimitedState(true);
      setLockoutMinutes(minutes);
      setError(`Too many requests. Please wait ${minutes} minute${minutes !== 1 ? 's' : ''} before trying again.`);
      return;
    }

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      // Record this attempt for rate limiting
      const attemptCount = recordResetAttempt();

      // Check if we just hit the limit
      if (attemptCount >= RESET_LIMIT) {
        setIsRateLimitedState(true);
        setLockoutMinutes(15);
      }

      const { error: resetError } = await resetPassword(trimmedEmail);

      // Security best practice: Always show success even if email doesn't exist
      // This prevents email enumeration attacks
      if (resetError) {
        console.error('Reset password error:', resetError);
      }

      // Log password reset request (fire and forget - non-blocking)
      setTimeout(async () => {
        try {
          const [deviceInfo, locationInfo] = await Promise.all([
            getDeviceInfo().catch(() => null),
            getLocationInfo().catch(() => null),
          ]);

          await supabase.from('login_activity').insert({
            user_id: null, // Don't reveal if user exists
            email: trimmedEmail,
            success: true,
            device_fingerprint: deviceInfo?.fingerprint || null,
            device_type: 'password_reset_request', // Special type for reset requests
            browser: deviceInfo?.browser || null,
            os: deviceInfo?.os || null,
            ip_address: locationInfo?.ip || null,
            city: locationInfo?.city || null,
            country: locationInfo?.country || null,
            user_agent: deviceInfo?.userAgent || null,
            error_message: resetError?.message || null,
          });
        } catch (err) {
          console.error('Failed to log password reset request:', err);
        }
      }, 0);

      setIsSuccess(true);
      // Reset countdown for resend button
      setResendCountdown(RESEND_COOLDOWN);
      setCanResend(false);
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = () => {
    // Check rate limiting before resend
    if (isRateLimited()) {
      const minutes = getRemainingLockoutTime();
      setIsRateLimitedState(true);
      setLockoutMinutes(minutes);
      setError(`Too many requests. Please wait ${minutes} minute${minutes !== 1 ? 's' : ''}.`);
      return;
    }

    setIsSuccess(false);
    setError('');
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  // Success State
  if (isSuccess) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundColor: '#f5f7f8',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div className="w-full max-w-[400px]">
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: '#34C759' }}
            >
              <span
                className="material-symbols-outlined text-white"
                style={{ fontSize: '48px', fontVariationSettings: "'FILL' 1" }}
              >
                check
              </span>
            </div>
          </div>

          {/* Title */}
          <h1
            className="text-center mb-3"
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#1d1d1f',
              letterSpacing: '-0.5px',
            }}
          >
            Check your email
          </h1>

          {/* Description */}
          <p
            className="text-center mb-2"
            style={{
              fontSize: '16px',
              color: '#86868b',
              lineHeight: '1.5',
            }}
          >
            We've sent a password reset link to
          </p>
          <p
            className="text-center mb-8"
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#1d1d1f',
            }}
          >
            {email}
          </p>

          {/* Info Box */}
          <div
            className="rounded-xl p-4 mb-8"
            style={{ backgroundColor: 'rgba(0, 122, 255, 0.06)' }}
          >
            <p
              className="text-center text-sm"
              style={{ color: '#86868b' }}
            >
              <span className="font-semibold" style={{ color: '#1d1d1f' }}>
                Didn't receive the email?
              </span>
              <br />
              Check your spam folder or try again in a few minutes.
            </p>
          </div>

          {/* Back to Sign In Button */}
          <Link
            to="/"
            className="w-full h-[52px] rounded-xl text-white text-base font-semibold transition-all flex items-center justify-center hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: '#007AFF' }}
          >
            Back to Sign In
          </Link>

          {/* Resend Link with Countdown */}
          <div className="mt-6 text-center">
            {canResend ? (
              <button
                onClick={handleResendEmail}
                className="text-base font-medium hover:underline"
                style={{ color: '#007AFF' }}
              >
                Resend email
              </button>
            ) : (
              <span
                className="text-base"
                style={{ color: '#86868b' }}
              >
                Resend email ({resendCountdown}s)
              </span>
            )}
          </div>

          {/* Rate limit warning */}
          {isRateLimitedState && (
            <div
              className="mt-4 p-3 rounded-xl text-center"
              style={{
                backgroundColor: 'rgba(255, 149, 0, 0.1)',
                border: '1px solid rgba(255, 149, 0, 0.3)',
              }}
            >
              <p className="text-sm" style={{ color: '#FF9500' }}>
                {lockoutMinutes > 0
                  ? `Rate limited. Try again in ${lockoutMinutes} minute${lockoutMinutes !== 1 ? 's' : ''}.`
                  : 'You can request another reset now.'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default / Loading / Error State
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: '#f5f7f8',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div className="w-full max-w-[400px]">
        {/* MRC Logo */}
        <div className="flex justify-center mb-8">
          <div
            className="w-20 h-20 rounded-2xl shadow-lg flex items-center justify-center p-1.5"
            style={{ backgroundColor: '#007AFF' }}
          >
            <img
              src={logoLarge}
              alt="Mould & Restoration Co."
              className="w-16 h-16 object-contain"
            />
          </div>
        </div>

        {/* Title */}
        <h1
          className="text-center mb-2"
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#1d1d1f',
            letterSpacing: '-0.5px',
          }}
        >
          MRC Internal System
        </h1>

        {/* Subtitle */}
        <p
          className="text-center mb-8"
          style={{
            fontSize: '17px',
            color: '#86868b',
          }}
        >
          Staff Portal
        </p>

        {/* Description */}
        <p
          className="text-center mb-8"
          style={{
            fontSize: '16px',
            color: '#1d1d1f',
            opacity: 0.8,
          }}
        >
          Enter your email to receive a reset link.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <div
              className={`relative rounded-xl transition-all ${error ? 'bg-red-50/50' : ''}`}
            >
              <span
                className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2"
                style={{
                  fontSize: '20px',
                  color: error ? '#FF3B30' : '#86868b',
                }}
              >
                mail
              </span>
              <input
                type="email"
                placeholder="staff@mrc.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                disabled={isLoading}
                autoFocus
                className={`w-full h-[52px] pl-12 pr-4 rounded-xl bg-white text-base outline-none transition-all ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{
                  color: '#1d1d1f',
                  border: error ? '2px solid #FF3B30' : '1px solid #e5e5e5',
                }}
              />
            </div>
            {error && (
              <p
                className="mt-1.5 text-sm flex items-center gap-1"
                style={{ color: '#FF3B30' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  error
                </span>
                {error}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isRateLimitedState}
            className={`w-full h-[52px] rounded-xl text-white text-base font-semibold transition-all flex items-center justify-center gap-2 shadow-lg ${
              isLoading || isRateLimitedState ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]'
            }`}
            style={{
              backgroundColor: '#007AFF',
              boxShadow: '0 4px 14px rgba(0, 122, 255, 0.25)',
            }}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        {/* Back to Sign In Link */}
        <div className="mt-12 flex justify-center">
          <Link
            to="/"
            className="flex items-center gap-2 font-medium hover:opacity-80 transition-opacity min-h-[48px]"
            style={{ color: '#007AFF' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              arrow_back_ios
            </span>
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
