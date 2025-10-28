import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logoMRC from "@/assets/logoMRC.png";
import { Rocket, Book, Video, MessageCircle, CheckCircle2 } from "lucide-react";

export default function GetStarted() {
  const [countdown, setCountdown] = useState(5);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Mark onboarding as complete
    const completeOnboarding = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from("profiles").update({
          onboarding_completed: true,
          onboarding_step: "complete",
          onboarding_completed_at: new Date().toISOString(),
        }).eq("id", user.id);
      } catch (error) {
        console.error("Error completing onboarding:", error);
      }
    };

    completeOnboarding();

    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Auto-redirect when countdown reaches 0
      handleGoToDashboard();
    }
  }, [countdown]);

  const handleGoToDashboard = () => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    navigate("/dashboard");
  };

  const quickStartSteps = [
    {
      number: "1️⃣",
      title: "Add your first lead",
      description: "Import or create a new customer inquiry",
    },
    {
      number: "2️⃣",
      title: "Schedule an inspection",
      description: "Book your first appointment in the calendar",
    },
    {
      number: "3️⃣",
      title: "Complete the inspection",
      description: "Use the mobile form on-site",
    },
    {
      number: "4️⃣",
      title: "Generate & send report",
      description: "Professional PDF reports with quotes",
    },
    {
      number: "5️⃣",
      title: "Track to completion",
      description: "Monitor through our 12-stage pipeline",
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-3xl">
        <div className="bg-card rounded-2xl shadow-2xl p-8 sm:p-12">
          {/* Logo */}
          <div className="text-center mb-6">
            <img 
              src={logoMRC} 
              alt="Mould & Restoration Co." 
              className="h-20 mx-auto mb-6"
            />

            {/* Success Icon with Animation */}
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/20 mb-6 animate-in zoom-in duration-500">
              <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-500" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              YOU'RE ALL SET!
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Your MRC system is ready to use!
            </p>
          </div>

          {/* Quick Start Guide */}
          <div className="bg-muted/50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-foreground mb-6 text-center">
              QUICK START GUIDE
            </h2>

            <div className="space-y-4">
              {quickStartSteps.map((step, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <span className="text-2xl flex-shrink-0">{step.number}</span>
                  <div>
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Primary CTA */}
          <div className="space-y-4 mb-6">
            <Button
              onClick={handleGoToDashboard}
              className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              size="lg"
              disabled={isRedirecting}
            >
              <Rocket className="w-5 h-5 mr-2" />
              {isRedirecting ? "Loading Dashboard..." : "GO TO DASHBOARD"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Auto-redirecting to dashboard in {countdown} second{countdown !== 1 ? 's' : ''}...
            </p>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              onClick={() => window.open("https://docs.lovable.dev", "_blank")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Book className="w-4 h-4" />
              View Documentation
            </Button>

            <Button
              onClick={() => window.open("https://youtube.com", "_blank")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              Watch Video Tutorials
            </Button>

            <Button
              onClick={() => toast({ 
                title: "Contact Support", 
                description: "Email: support@mrc.com.au\nPhone: 1300 665 673" 
              })}
              variant="outline"
              className="flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
