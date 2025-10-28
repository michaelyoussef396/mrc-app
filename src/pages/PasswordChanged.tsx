import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoMRC from "@/assets/logoMRC.png";
import { CheckCircle2, Lock, Shield, Key } from "lucide-react";

export default function PasswordChanged() {
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Auto-redirect when countdown reaches 0
      navigate("/");
    }
  }, [countdown, navigate]);

  const handleLoginNow = () => {
    navigate("/");
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
            {/* Success Icon with Animation */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-4 animate-in zoom-in duration-500">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Password Successfully Changed
              </h1>
              <p className="text-sm text-muted-foreground">
                Your password has been updated!
              </p>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-base text-foreground mb-6">
                  You can now log in with your new password.
                </p>
              </div>

              {/* Security Tips */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  For your security:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <Lock className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span>Keep your password secure and don't share it</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Key className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span>Use a unique password for this account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span>Consider using a password manager</span>
                  </li>
                </ul>
              </div>

              {/* Login Button */}
              <Button
                onClick={handleLoginNow}
                className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Log In Now
              </Button>

              {/* Auto-redirect Message */}
              <p className="text-center text-sm text-muted-foreground">
                Auto-redirecting to login in {countdown} second{countdown !== 1 ? 's' : ''}...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
