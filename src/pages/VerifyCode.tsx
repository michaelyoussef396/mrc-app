import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function VerifyCode() {
  const location = useLocation();
  const email = location.state?.email || "";
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Redirect if no email
  useEffect(() => {
    if (!email) {
      navigate("/forgot-password");
    }
  }, [email, navigate]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);
  
  // Auto-submit when all 6 digits entered
  useEffect(() => {
    const isComplete = code.every(digit => digit !== "");
    if (isComplete && !verifying && !error) {
      handleVerify();
    }
  }, [code]);
  
  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError("");
    
    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Backspace: clear current and go to previous
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split("");
      setCode(newCode);
      inputRefs.current[5]?.focus();
    }
  };
  
  const handleVerify = async () => {
    const verificationCode = code.join("");
    
    if (verificationCode.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }
    
    setVerifying(true);
    setError("");
    
    try {
      // For now, simulate verification
      // TODO: Implement actual OTP verification with Supabase
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success - redirect to reset password
      navigate("/reset-password", { state: { email, codeVerified: true } });
      
      toast({
        title: "Code Verified!",
        description: "Please enter your new password.",
      });
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
      
      // Shake animation and clear code after delay
      setTimeout(() => {
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }, 500);
    } finally {
      setVerifying(false);
    }
  };
  
  const handleResend = async () => {
    setResending(true);
    setResent(false);
    setError("");
    
    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to resend code",
        });
      } else {
        setResent(true);
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        
        toast({
          title: "Code Sent!",
          description: "We've sent a new verification code to your email.",
        });
        
        setTimeout(() => setResent(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };
  
  const handleBack = () => {
    navigate("/check-email", { state: { email } });
  };
  
  if (!email) {
    return null;
  }
  
  return (
    <div className="verify-code-page">
      {/* Blue Animated Background */}
      <div className="verify-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="gradient-orb orb-4"></div>
      </div>
      
      {/* Content Card */}
      <div className="verify-container">
        <div className={`verify-card glass-card ${error ? "shake" : ""}`}>
          {/* Back Button */}
          <button className="back-button-verify" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          
          {/* Icon */}
          <div className="verify-icon-wrapper">
            <div className="verify-icon">
              <span className="icon-emoji">🔐</span>
            </div>
          </div>
          
          {/* Header */}
          <div className="verify-header">
            <h1 className="verify-title">Enter Verification Code</h1>
            <p className="verify-subtitle">
              We sent a 6-digit code to
            </p>
            <p className="verify-email">{email}</p>
          </div>
          
          {/* Code Input */}
          <div className="code-input-container">
            <div className="code-inputs" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  className={`code-digit-input ${digit ? "filled" : ""} ${error ? "error" : ""}`}
                  disabled={verifying}
                />
              ))}
            </div>
            
            {/* Verifying Indicator */}
            {verifying && (
              <div className="verifying-indicator">
                <span className="loading-spinner-small"></span>
                <span className="verifying-text">Verifying code...</span>
              </div>
            )}
            
            {/* Error Message */}
            {error && (
              <div className="error-message-verify">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}
          </div>
          
          {/* Timer/Expiry Notice */}
          <div className="expiry-notice">
            <span className="clock-icon">⏱️</span>
            <p className="expiry-text">Code expires in 10 minutes</p>
          </div>
          
          {/* Actions */}
          <div className="verify-actions">
            <div className="resend-section">
              <p className="resend-text">Didn't receive the code?</p>
              <Button
                onClick={handleResend}
                disabled={resending || resent}
                variant="outline"
                className="btn-resend"
                size="sm"
              >
                {resending ? (
                  <>
                    <span className="loading-spinner-small"></span>
                    <span>Sending...</span>
                  </>
                ) : resent ? (
                  <>
                    <span>✓</span>
                    <span>Code Sent!</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Resend Code</span>
                  </>
                )}
              </Button>
            </div>
            
            <Button
              variant="outline"
              className="btn-back-login w-full"
              onClick={() => navigate("/")}
              size="default"
            >
              Cancel & Return to Login
            </Button>
          </div>
          
          {/* Tips */}
          <div className="verify-tips">
            <p className="tip-title">💡 Tips:</p>
            <ul className="tip-list">
              <li>Check your spam or junk folder</li>
              <li>You can paste the full code from your email</li>
              <li>Code is case-insensitive</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
