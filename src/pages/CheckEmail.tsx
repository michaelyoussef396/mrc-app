import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import logoMRC from "@/assets/logoMRC.png";
import { ArrowLeft, Mail } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function CheckEmail() {
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiryCountdown, setExpiryCountdown] = useState(600); // 10 minutes in seconds
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [code, setCode] = useState("");
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

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Expiry countdown timer
  useEffect(() => {
    if (expiryCountdown > 0) {
      const timer = setTimeout(() => setExpiryCountdown(expiryCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [expiryCountdown]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6) {
      handleVerifyCode();
    }
  }, [code]);

  const handleVerifyCode = async () => {
    if (code.length !== 6) return;
    if (expiryCountdown <= 0) {
      toast({
        variant: "destructive",
        title: "Code Expired",
        description: "This code has expired. Please request a new one.",
      });
      return;
    }

    setIsVerifying(true);
    try {
      // TODO: Implement code verification with backend
      // For now, simulate verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If valid, redirect to reset password
      navigate("/reset-password", { state: { email: location.state?.email, codeVerified: true } });
      
      toast({
        title: "Code Verified",
        description: "Please enter your new password",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: error.message || "The code you entered is invalid. Please try again.",
      });
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    try {
      const { error } = await resetPassword(location.state?.email);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to resend code",
        });
      } else {
        toast({
          title: "Code Sent",
          description: "We've sent a new 6-digit code to your email",
        });
        setResendCooldown(60);
        setExpiryCountdown(600); // Reset expiry to 10 minutes
        setCode(""); // Clear the input
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                  We've sent a 6-digit code to:
                </p>
                <p className="text-base font-semibold text-foreground mb-6">
                  {email}
                </p>
              </div>

              {/* Code Input */}
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Enter the code below:
                  </p>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={code}
                      onChange={(value) => setCode(value)}
                      disabled={isVerifying || expiryCountdown <= 0}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                {/* Verify Button */}
                <Button
                  onClick={handleVerifyCode}
                  disabled={code.length !== 6 || isVerifying || expiryCountdown <= 0}
                  className="w-full"
                  size="lg"
                >
                  {isVerifying ? "Verifying..." : "Verify Code"}
                </Button>
              </div>

              {/* Timer and Status */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    Code expires in:
                  </p>
                  <p className={`text-lg font-bold ${expiryCountdown < 60 ? 'text-destructive' : 'text-foreground'}`}>
                    {formatTime(expiryCountdown)}
                  </p>
                </div>
                
                {expiryCountdown <= 0 && (
                  <p className="text-sm text-destructive text-center font-medium">
                    Code expired. Please request a new one.
                  </p>
                )}
              </div>

              {/* Resend Button */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Didn't receive the code?
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
                    : "Resend Code"}
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
