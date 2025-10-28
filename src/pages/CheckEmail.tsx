import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import logoMRC from "@/assets/logoMRC.png";
import { ArrowLeft, Mail } from "lucide-react";

export default function CheckEmail() {
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get email from navigation state
  const email = location.state?.email || "your email";

  useEffect(() => {
    // If no email in state, redirect back to forgot password
    if (!location.state?.email) {
      navigate("/forgot-password");
      return;
    }

    // Start cooldown timer
    setResendCooldown(60);
  }, [location.state, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    try {
      const { error } = await resetPassword(location.state?.email);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to resend reset email",
        });
      } else {
        toast({
          title: "Email Sent",
          description: "We've sent another reset link to your email",
        });
        setResendCooldown(60);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-6 sm:px-8 py-8 text-center">
            <div className="inline-block mb-3">
              <img 
                src={logoMRC} 
                alt="Mould & Restoration Co." 
                className="h-16 sm:h-20"
              />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Email Icon */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Check Your Email
              </h1>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  We've sent a password reset link to:
                </p>
                <p className="text-base font-semibold text-foreground mb-4">
                  {email}
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-foreground font-medium">
                  The link will expire in 1 hour for security reasons.
                </p>
                <p className="text-sm text-muted-foreground">
                  If you don't see the email:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Check your spam folder</li>
                  <li>• Make sure the email address is correct</li>
                  <li>• Wait a few minutes and check again</li>
                </ul>
              </div>

              {/* Resend Button */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Didn't receive the email?
                </p>
                <Button
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isResending}
                  variant="outline"
                  className="w-full"
                >
                  {isResending
                    ? "Sending..."
                    : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend Reset Link"}
                </Button>
              </div>

              {/* Back to Login */}
              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
