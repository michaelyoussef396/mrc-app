import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import logoLarge from '@/assets/logo-large.png';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidSession, setIsValidSession] = useState(false);

  // Validate the reset token on mount
  useEffect(() => {
    const validateSession = async () => {
      try {
        // Check if we have a valid recovery session
        // Supabase handles the token exchange automatically via detectSessionInUrl
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          console.log('✅ Valid session found for password reset');
          setIsValidSession(true);
        } else {
          // Wait a bit for Supabase to process the URL
          console.log('⏳ Waiting for Supabase to process reset token...');

          // Listen for auth state changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
              console.log('🔔 Auth event:', event);
              if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
                console.log('✅ Recovery session established');
                setIsValidSession(true);
                setIsValidating(false);
              }
            }
          );

          // Timeout after 5 seconds
          setTimeout(() => {
            if (!isValidSession) {
              console.log('❌ No valid session after timeout');
              setError('Invalid or expired reset link. Please request a new one.');
              setIsValidating(false);
            }
          }, 5000);

          return () => subscription.unsubscribe();
        }
      } catch (err) {
        console.error('Session validation error:', err);
        setError('Something went wrong. Please try again.');
      } finally {
        setIsValidating(false);
      }
    };

    validateSession();
  }, []);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (error) setError('');
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!password) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await updatePassword(password);

      if (updateError) {
        console.error('Update password error:', updateError);
        if (updateError.message?.includes('session')) {
          setError('Your reset link has expired. Please request a new one.');
        } else {
          setError(updateError.message || 'Failed to update password');
        }
        return;
      }

      console.log('✅ Password updated successfully');
      setIsSuccess(true);

      // Sign out and redirect to login after 3 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/', {
          state: { message: 'Password updated successfully. Please sign in with your new password.' }
        });
      }, 3000);

    } catch (err) {
      console.error('Password update error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Validating State
  if (isValidating) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundColor: '#f5f7f8',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div className="w-full max-w-[400px] text-center">
          {/* Loading Spinner */}
          <div className="flex justify-center mb-8">
            <div
              className="w-20 h-20 rounded-2xl shadow-lg flex items-center justify-center"
              style={{ backgroundColor: '#007AFF' }}
            >
              <svg
                className="animate-spin h-10 w-10 text-white"
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
            </div>
          </div>

          <h1
            className="mb-3"
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#1d1d1f',
            }}
          >
            Validating Reset Link
          </h1>

          <p style={{ fontSize: '16px', color: '#86868b' }}>
            Please wait while we verify your password reset link...
          </p>
        </div>
      </div>
    );
  }

  // Invalid Session State
  if (!isValidSession && error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundColor: '#f5f7f8',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div className="w-full max-w-[400px] text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-8">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: '#FF3B30' }}
            >
              <span
                className="material-symbols-outlined text-white"
                style={{ fontSize: '48px' }}
              >
                error
              </span>
            </div>
          </div>

          <h1
            className="mb-3"
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#1d1d1f',
            }}
          >
            Invalid Reset Link
          </h1>

          <p
            className="mb-8"
            style={{ fontSize: '16px', color: '#86868b' }}
          >
            {error}
          </p>

          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full h-[52px] rounded-xl text-white text-base font-semibold transition-all flex items-center justify-center hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: '#007AFF' }}
          >
            Request New Reset Link
          </button>
        </div>
      </div>
    );
  }

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
        <div className="w-full max-w-[400px] text-center">
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

          <h1
            className="mb-3"
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#1d1d1f',
            }}
          >
            Password Updated!
          </h1>

          <p
            className="mb-6"
            style={{ fontSize: '16px', color: '#86868b' }}
          >
            Your password has been changed successfully.
          </p>

          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)' }}
          >
            <p
              className="text-sm flex items-center justify-center gap-2"
              style={{ color: '#34C759' }}
            >
              <svg
                className="animate-spin h-4 w-4"
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
              Redirecting to sign in...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Password Reset Form
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
          Create New Password
        </h1>

        {/* Subtitle */}
        <p
          className="text-center mb-8"
          style={{
            fontSize: '16px',
            color: '#86868b',
          }}
        >
          Enter your new password below
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div
              className="p-3 rounded-xl flex items-center gap-3"
              style={{
                backgroundColor: 'rgba(255, 59, 48, 0.1)',
                border: '1px solid rgba(255, 59, 48, 0.3)',
              }}
            >
              <span
                className="material-symbols-outlined flex-shrink-0"
                style={{ fontSize: '20px', color: '#FF3B30' }}
              >
                error
              </span>
              <p className="text-sm" style={{ color: '#FF3B30' }}>
                {error}
              </p>
            </div>
          )}

          {/* New Password Input */}
          <div>
            <div className="relative rounded-xl">
              <span
                className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2"
                style={{ fontSize: '20px', color: '#86868b' }}
              >
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                disabled={isLoading}
                autoFocus
                className={`w-full h-[52px] pl-12 pr-12 rounded-xl bg-white text-base outline-none transition-all ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{
                  color: '#1d1d1f',
                  border: '1px solid #e5e5e5',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '20px', color: '#86868b' }}
                >
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <p className="mt-1 text-xs" style={{ color: '#86868b' }}>
              At least 6 characters
            </p>
          </div>

          {/* Confirm Password Input */}
          <div>
            <div className="relative rounded-xl">
              <span
                className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2"
                style={{ fontSize: '20px', color: '#86868b' }}
              >
                lock
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                disabled={isLoading}
                className={`w-full h-[52px] pl-12 pr-12 rounded-xl bg-white text-base outline-none transition-all ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{
                  color: '#1d1d1f',
                  border: '1px solid #e5e5e5',
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '20px', color: '#86868b' }}
                >
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {confirmPassword && (
              <p
                className="mt-1 text-xs font-medium flex items-center gap-1"
                style={{ color: password === confirmPassword ? '#34C759' : '#FF3B30' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  {password === confirmPassword ? 'check_circle' : 'cancel'}
                </span>
                {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || password.length < 6 || password !== confirmPassword}
            className={`w-full h-[52px] rounded-xl text-white text-base font-semibold transition-all flex items-center justify-center gap-2 shadow-lg mt-6 ${
              isLoading || password.length < 6 || password !== confirmPassword
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:opacity-90 active:scale-[0.98]'
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
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </form>

        {/* Back to Login Link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm font-medium hover:underline"
            style={{ color: '#86868b' }}
          >
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
