import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoMRC from "@/assets/logoMRC.png";
import { CheckCircle2 } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/setup");
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="bg-card rounded-2xl shadow-2xl p-8 sm:p-12 text-center">
          {/* Logo */}
          <div className="mb-8">
            <img 
              src={logoMRC} 
              alt="Mould & Restoration Co." 
              className="h-24 sm:h-32 mx-auto"
            />
          </div>

          {/* Welcome Message */}
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Welcome to Mould & Restoration Co.
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8">
            Your complete mould inspection and remediation management system
          </p>

          <p className="text-xl font-semibold text-foreground mb-8">
            Let's get you set up in just 3 minutes!
          </p>

          {/* Features List */}
          <div className="bg-muted/50 rounded-lg p-6 mb-8 text-left max-w-md mx-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <span className="text-base text-foreground">Configure your company details</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <span className="text-base text-foreground">Set up your team</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <span className="text-base text-foreground">Learn the key features</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <span className="text-base text-foreground">Start managing leads</span>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleGetStarted}
              className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              size="lg"
            >
              LET'S GET STARTED
            </Button>

            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip Setup - I'll Do This Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
