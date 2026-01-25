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
  // This handles the race condition between navigation and state updates
  if (userRoles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-foreground">Loading your permissions...</p>
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
