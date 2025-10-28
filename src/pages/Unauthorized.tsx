import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, LogIn, Home, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/src/assets/logoMRC.png" alt="MRC Logo" className="h-12" />
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
        </div>

        {/* Error Code */}
        <div className="space-y-2">
          <h1 className="text-7xl font-bold text-muted-foreground">403</h1>
          <h2 className="text-3xl font-bold text-foreground">ACCESS DENIED</h2>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <p className="text-lg text-foreground">
            You don't have permission to access this page.
          </p>
        </div>

        {/* Reasons */}
        <div className="bg-muted/50 rounded-lg p-6 text-left max-w-md mx-auto">
          <p className="text-sm font-medium text-foreground mb-3">This could be because:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-foreground">•</span>
              <span>You're not logged in</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground">•</span>
              <span>Your session has expired</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground">•</span>
              <span>You don't have the required role</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground">•</span>
              <span>This page is for administrators only</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">What you can do:</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!user ? (
              <Button onClick={() => navigate("/")} className="gap-2">
                <LogIn className="w-4 h-4" />
                Log In
              </Button>
            ) : (
              <Button onClick={() => navigate("/dashboard")} className="gap-2">
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Button>
            )}
            <Button 
              onClick={() => window.location.href = "mailto:support@mrc.com.au?subject=Access%20Request"}
              variant="outline" 
              className="gap-2"
            >
              <Mail className="w-4 h-4" />
              Request Access
            </Button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="pt-8 space-y-2">
          <p className="text-sm font-medium text-foreground">Need admin access?</p>
          <p className="text-sm text-muted-foreground">
            Contact your system administrator
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
            <Mail className="w-4 h-4" />
            <a href="mailto:support@mrc.com.au" className="hover:text-foreground transition-colors">
              support@mrc.com.au
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
