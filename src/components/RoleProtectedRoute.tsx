import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

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

  // Show loading spinner while auth state is being determined
  // This includes role fetching - loading only becomes false AFTER roles are fetched
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

  // Auth completed but user has no roles - show error with retry option
  // This only happens if the user truly has no roles assigned in the database
  if (userRoles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">&#9888;&#65039;</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No Permissions Assigned
          </h2>
          <p className="text-muted-foreground mb-6">
            Your account doesn't have any roles assigned. Please contact an administrator.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
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

  // Check if user has any of the allowed roles
  const hasAccess = allowedRoles.some(role => hasRole(role));

  if (!hasAccess) {
    // Redirect to login page if user doesn't have required role
    // They can then select an appropriate role they have access to
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
