import { Wrench, RefreshCw, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const Maintenance = () => {
  const [countdown, setCountdown] = useState(45);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleCheckStatus = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/src/assets/logoMRC.png" alt="MRC Logo" className="h-12" />
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Wrench className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">SCHEDULED MAINTENANCE</h2>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <p className="text-lg text-foreground">
            We're making improvements!
          </p>
          <p className="text-muted-foreground">
            The MRC system is currently undergoing scheduled maintenance.
          </p>
        </div>

        {/* Countdown */}
        <div className="bg-muted/50 rounded-lg p-6 max-w-md mx-auto space-y-2">
          <p className="text-sm font-medium text-foreground">Expected completion:</p>
          <p className="text-2xl font-bold text-foreground">3:00 PM AEDT</p>
          <p className="text-sm text-muted-foreground">
            (Approximately {countdown} minutes)
          </p>
        </div>

        {/* Apology */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            We apologize for any inconvenience.
          </p>
        </div>

        {/* Emergency Contact */}
        <div className="pt-8 space-y-4">
          <p className="text-sm font-medium text-foreground">Need urgent assistance?</p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <a href="tel:1300665673" className="hover:text-foreground transition-colors">
              Emergency Line: 1300 665 673
            </a>
          </div>
        </div>

        {/* Check Status Button */}
        <div className="pt-4">
          <Button onClick={handleCheckStatus} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Check Status
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
