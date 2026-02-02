import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface RoleProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

/**
 * Route guard that restricts access based on user roles.
 *
 * Usage:
 * <RoleProtectedRoute allowedRoles={['admin', 'developer']}>
 *   <ProtectedComponent />
 * </RoleProtectedRoute>
 *
 * @param allowedRoles - Array of role names that can access this route
 * @param children - The protected content to render
 */
export default function RoleProtectedRoute({ allowedRoles, children }: RoleProtectedRouteProps) {
  const { hasRole, loading, session, userRoles } = useAuth();
  const [roleLoadingTimeout, setRoleLoadingTimeout] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  // Timeout for role loading - if roles don't load within 10 seconds after auth completes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;
    let retryTimeoutId: NodeJS.Timeout | undefined;

    // Only start timeout if auth is done loading but roles are empty
    if (!loading && session && userRoles.length === 0) {
      // Give 10 seconds for roles to load (increased from 5s to handle network latency)
      timeoutId = setTimeout(() => {
        console.warn('[RoleProtectedRoute] Role loading timeout');
        setRoleLoadingTimeout(true);
      }, 10000);

      // Show retry button after 5 seconds
      retryTimeoutId = setTimeout(() => {
        setShowRetry(true);
      }, 5000);
    }

    // Reset timeout state when roles are loaded
    if (userRoles.length > 0) {
      setRoleLoadingTimeout(false);
      setShowRetry(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
    };
  }, [loading, session, userRoles.length]);

  // Handle retry
  const handleRetry = () => {
    window.location.reload();
  };

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // If no session, redirect to login
  if (!session) {
    return <Navigate to="/" replace />;
  }

  // If session exists but roles haven't been loaded yet, show loading
  // But with timeout protection to prevent infinite loading
  if (userRoles.length === 0) {
    // After timeout, show retry/logout options instead of auto-redirecting
    // This prevents race conditions where roles are being fetched but state hasn't propagated yet
    if (roleLoadingTimeout) {
      console.warn('[RoleProtectedRoute] No roles found after timeout, showing retry options');
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Permission Loading Issue
            </h2>
            <p className="text-muted-foreground mb-6">
              We're having trouble loading your permissions. This might be a temporary network issue.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleRetry}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full px-6 py-3 border border-gray-300 text-foreground rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Return to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-foreground">Loading your permissions...</p>

          {/* Show retry button after 3 seconds */}
          {showRetry && (
            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-3">
                Taking longer than expected?
              </p>
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Check if user has any of the allowed roles
  const hasAccess = allowedRoles.some(role => hasRole(role));

  if (!hasAccess) {
    // Redirect to login page if user doesn't have required role
    // They can then select an appropriate role they have access to
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
