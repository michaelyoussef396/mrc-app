import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logoMRC from "@/assets/logoMRC.png";
import { 
  X, ArrowLeft, ArrowRight, 
  LayoutDashboard, FileText, Calendar, 
  Clipboard, BarChart3 
} from "lucide-react";

const tourSteps = [
  {
    icon: LayoutDashboard,
    title: "YOUR BUSINESS DASHBOARD",
    description: "This is your command center! See key metrics, pipeline status, upcoming appointments, and more at a glance.",
  },
  {
    icon: FileText,
    title: "LEAD MANAGEMENT",
    description: "Track every customer from first contact to final payment through our 12-stage pipeline. Add new leads, update status, and never lose track of anyone!",
  },
  {
    icon: Calendar,
    title: "CALENDAR & SCHEDULING",
    description: "Book inspections and jobs with drag-and-drop simplicity. Automatic travel time calculation ensures realistic scheduling.",
  },
  {
    icon: Clipboard,
    title: "MOBILE INSPECTION FORM",
    description: "Complete inspections on-site with your phone or tablet. Photos, readings, AI-generated reports, and real-time quotes!",
  },
  {
    icon: BarChart3,
    title: "BUSINESS REPORTS",
    description: "Track revenue, profits, team performance, and more. Make data-driven decisions with comprehensive analytics.",
  },
];

export default function Tour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSkipping, setIsSkipping] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSkip = async () => {
    setIsSkipping(true);
    await completeTour();
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      await supabase.from("profiles").update({
        onboarding_step: "complete",
      }).eq("id", user.id);

      navigate("/get-started");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to complete tour",
      });
    } finally {
      setIsSkipping(false);
    }
  };

  const progressPercentage = ((currentStep + 1) / tourSteps.length) * 100;
  const CurrentIcon = tourSteps[currentStep].icon;

  return (
    <div className="min-h-screen bg-background/50 flex items-center justify-center px-4 py-8 relative">
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Skip Button */}
      <button
        onClick={handleSkip}
        disabled={isSkipping}
        className="absolute top-4 right-4 z-50 text-white hover:text-gray-300 flex items-center gap-1 text-sm font-medium transition-colors"
      >
        <X className="w-4 h-4" />
        Skip Tour
      </button>

      {/* Logo */}
      <img 
        src={logoMRC} 
        alt="MRC" 
        className="absolute top-4 left-4 h-10 opacity-80"
      />

      {/* Tour Card */}
      <div className="relative z-10 w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">TOUR PROGRESS</span>
            <span className="text-sm text-white/80">Step {currentStep + 1} of {tourSteps.length}</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-card rounded-2xl shadow-2xl p-8 sm:p-12 text-center">
          {/* Icon */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
              <CurrentIcon className="w-10 h-10 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {tourSteps[currentStep].title}
          </h2>

          {/* Description */}
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            {tourSteps[currentStep].description}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            {currentStep > 0 ? (
              <Button onClick={handleBack} variant="outline" size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            <Button onClick={handleNext} size="lg" className="min-w-32">
              {currentStep === tourSteps.length - 1 ? (
                "Finish Tour"
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? "w-8 bg-primary"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
