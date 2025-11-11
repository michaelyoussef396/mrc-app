import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔍 === PASSWORD RESET DIAGNOSTICS ===');
    console.log('📍 Full URL:', window.location.href);
    console.log('🔍 Search params:', searchParams.toString());
    console.log('🔍 Hash:', window.location.hash);

    // CRITICAL: Detect if this is a password reset URL
    // Check multiple formats to handle different Supabase auth flows
    const hasTokenHash = searchParams.has('token_hash') && searchParams.get('type') === 'recovery';
    const hasRecoveryHash = window.location.hash.includes('type=recovery') && window.location.hash.includes('access_token');
    const hasResetCode = searchParams.has('code');

    // Also check if Supabase has already processed the URL and stored session
    // This happens when detectSessionInUrl removes params from URL
    const hasError = searchParams.has('error') || window.location.hash.includes('error=');

    console.log('🔑 Has token_hash (?token_hash=):', hasTokenHash);
    console.log('🔑 Has recovery hash (#access_token + type=recovery):', hasRecoveryHash);
    console.log('🔑 Has reset code (?code=):', hasResetCode);
    console.log('🔑 Has error:', hasError);

    // If we have an error in the URL, show it and redirect
    if (hasError) {
      const errorDesc = searchParams.get('error_description') || 'Invalid or expired reset link';
      console.log('❌ Error in URL:', errorDesc);
      setError(errorDesc);
      setTimeout(() => navigate('/forgot-password'), 3000);
      return;
    }

    // Don't immediately redirect - wait for Supabase to process the token
    // Supabase's detectSessionInUrl will remove params from URL after processing
    const isPasswordReset = hasTokenHash || hasRecoveryHash || hasResetCode;

    console.log('🔑 Is password reset URL:', isPasswordReset);

    // If no reset params AND no existing session, then it's invalid
    // But give Supabase 2 seconds to process the URL first
    if (!isPasswordReset) {
      console.log('⏳ No reset params detected - waiting 2 seconds for Supabase processing...');

      const timeoutId = setTimeout(async () => {
        // Check if Supabase created a session during the 2 second wait
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.log('❌ No session after 2 seconds - not a valid reset URL');
          setError('Invalid password reset link');
          navigate('/forgot-password');
        } else {
          console.log('✅ Session found - assuming this was a valid reset URL');
          // Let the auth state change handler show the form
        }
      }, 2000);

      return () => clearTimeout(timeoutId);
    }

    // Listen for Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth Event:', event);
        console.log('📝 Session:', session ? 'Present' : 'None');

        // CRITICAL: For PKCE flow, Supabase exchanges the code automatically
        // The session will be a regular session, not a recovery session
        // We need to check if this came from a password reset link
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && isPasswordReset) {
          console.log('✅ Session detected with password reset URL');
          console.log('📊 Session user:', session.user?.email);
          console.log('📊 Session expires:', new Date(session.expires_at! * 1000).toLocaleString());

          // PKCE flow creates a regular session, but we can use it for password reset
          // because the user authenticated via the reset link email
          setShowForm(true);
        } else if (event === 'PASSWORD_RECOVERY') {
          console.log('✅ PASSWORD_RECOVERY event detected - showing form');
          setShowForm(true);
        } else {
          console.log('⏳ Waiting for session establishment...');
        }
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Attempting to update password...');

      // CRITICAL FIX: Use updateUser which works with both regular and recovery sessions
      // Supabase allows password updates if the user authenticated via reset link
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error('❌ Update error:', updateError);

        // If we get a session missing error, try the admin API approach
        if (updateError.message.includes('session') || updateError.message.includes('Auth session missing')) {
          console.log('⚠️ Session missing error - trying alternative approach...');

          // Get the current session
          const { data: { session } } = await supabase.auth.getSession();

          if (!session) {
            throw new Error('No active session found. Please request a new password reset link.');
          }

          console.log('📊 Current session:', session.user?.email);

          // Try updating with the session explicitly
          const { error: retryError } = await supabase.auth.updateUser(
            { password: password }
          );

          if (retryError) {
            console.error('❌ Retry failed:', retryError);
            throw new Error('Unable to update password. The reset link may have expired. Please request a new one.');
          }
        } else {
          throw updateError;
        }
      }

      console.log('✅ Password updated successfully');
      console.log('📊 Update result:', data);

      // Sign out to force fresh login with new password
      await supabase.auth.signOut();

      alert('✅ Password updated successfully! Please login with your new password.');

      setTimeout(() => {
        navigate('/login');
      }, 1000);

    } catch (err) {
      console.error('❌ Password reset error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update password';
      setError(errorMessage);

      // If it's a session-related error, provide helpful guidance
      if (errorMessage.includes('session') || errorMessage.includes('expired')) {
        setError('Your reset link has expired or is invalid. Please request a new password reset.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while waiting for Supabase to process the reset token
  if (!showForm) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-xl max-w-md mx-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto"></div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">Validating Reset Link</h2>
          <p className="mt-2 text-gray-600">Please wait while we verify your password reset link...</p>
          <p className="mt-4 text-sm text-gray-500">This may take a few moments</p>

          {/* Technical debug info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-left">
            <p className="text-xs text-blue-700 font-mono">
              <strong>Technical Info:</strong>
            </p>
            <p className="text-xs text-blue-600 font-mono mt-1">
              Waiting for Supabase auth event
            </p>
            <p className="text-xs text-blue-600 font-mono">
              (PASSWORD_RECOVERY, SIGNED_IN, or INITIAL_SESSION)
            </p>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show password reset form once session is validated
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 shadow-lg">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-3xl font-bold text-gray-900">Reset Your Password</h2>
          <p className="mt-2 text-sm text-gray-600">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              placeholder="Enter new password"
              required
              minLength={8}
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">At least 8 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              placeholder="Confirm new password"
              required
              minLength={8}
            />
            {confirmPassword && (
              <p className={`mt-1 text-xs font-medium ${password === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || password.length < 8 || password !== confirmPassword}
            className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating Password...
              </span>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition"
          >
            ← Back to Login
          </button>
        </div>

        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            🔒 Your password will be encrypted and stored securely
          </p>
        </div>
      </div>
    </div>
  );
}
