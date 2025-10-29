import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, ArrowRight, RefreshCw, Info } from "lucide-react";

export default function CheckEmail() {
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get email from navigation state
  const email = location.state?.email || "your@email.com";

  const handleResend = async () => {
    if (!location.state?.email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Email address not found. Please try again.",
      });
      return;
    }

    setIsResending(true);
    setResent(false);
    
    try {
      const { error } = await resetPassword(location.state.email);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to resend code",
        });
      } else {
        setResent(true);
        toast({
          title: "Code Sent!",
          description: "We've sent a new verification code to your email.",
        });
        
        // Reset the "resent" state after 3 seconds
        setTimeout(() => setResent(false), 3000);
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

  const handleContinue = () => {
    // Navigate to verify code page (to be created)
    navigate(`/verify-code`, { state: { email } });
  };

  return (
    <div className="check-email-page">
      {/* Blue Animated Background */}
      <div className="check-email-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="gradient-orb orb-4"></div>
      </div>
      
      {/* Content Card */}
      <div className="check-email-container">
        <div className="check-email-card glass-card">
          {/* Success Icon with Animated Checkmark */}
          <div className="success-icon-wrapper">
            <div className="success-icon-circle">
              <div className="success-checkmark">
                <svg 
                  className="checkmark-svg" 
                  viewBox="0 0 52 52"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle 
                    className="checkmark-circle" 
                    cx="26" 
                    cy="26" 
                    r="25" 
                    fill="none"
                  />
                  <path 
                    className="checkmark-check" 
                    fill="none" 
                    d="M14.1 27.2l7.1 7.2 16.7-16.8"
                  />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Header */}
          <div className="check-email-header">
            <h1 className="check-email-title">Check Your Email</h1>
            <p className="check-email-subtitle">
              We've sent a verification code to
            </p>
            <p className="check-email-address">{email}</p>
          </div>
          
          {/* Instructions */}
          <div className="email-instructions">
            <div className="instruction-step">
              <div className="step-number">
                <span>1</span>
              </div>
              <div className="step-content">
                <h3 className="step-title">Check your inbox</h3>
                <p className="step-description">
                  Look for an email from MRC with a 6-digit code
                </p>
              </div>
            </div>
            
            <div className="instruction-step">
              <div className="step-number">
                <span>2</span>
              </div>
              <div className="step-content">
                <h3 className="step-title">Enter the code</h3>
                <p className="step-description">
                  The code will expire in 10 minutes for security
                </p>
              </div>
            </div>
            
            <div className="instruction-step">
              <div className="step-number">
                <span>3</span>
              </div>
              <div className="step-content">
                <h3 className="step-title">Create new password</h3>
                <p className="step-description">
                  Choose a strong, unique password
                </p>
              </div>
            </div>
          </div>
          
          {/* Code Preview Box */}
          <div className="code-preview-box">
            <div className="code-preview-icon">✉️</div>
            <div className="code-preview-content">
              <p className="code-preview-title">Your code will look like this:</p>
              <div className="code-preview-example">
                <span className="code-digit">1</span>
                <span className="code-digit">2</span>
                <span className="code-digit">3</span>
                <span className="code-digit">4</span>
                <span className="code-digit">5</span>
                <span className="code-digit">6</span>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="check-email-actions">
            <Button
              onClick={handleContinue}
              className="btn-continue btn-primary-gradient w-full"
              size="lg"
            >
              <span>I Have My Code</span>
              <ArrowRight className="w-5 h-5 btn-arrow" />
            </Button>
            
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="btn-back-login w-full"
              size="lg"
            >
              <ArrowLeft className="w-5 h-5 back-arrow" />
              <span>Back to Login</span>
            </Button>
            
            <div className="resend-section">
              <p className="resend-text">Didn't receive the code?</p>
              <Button
                onClick={handleResend}
                disabled={isResending || resent}
                variant="outline"
                className="btn-resend"
                size="default"
              >
                {isResending ? (
                  <>
                    <span className="loading-spinner-small"></span>
                    <span>Sending...</span>
                  </>
                ) : resent ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Code Sent!</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Resend Code</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Footer Note */}
          <div className="check-email-footer">
            <div className="footer-note">
              <Info className="note-icon-svg" />
              <p className="note-text">
                Check your spam folder if you don't see the email. Need help?{' '}
                <a href="mailto:support@mrc.com.au" className="support-link">
                  Contact support
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
