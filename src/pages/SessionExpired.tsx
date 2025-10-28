import { useNavigate } from "react-router-dom";
import { Clock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

const SessionExpired = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/src/assets/logoMRC.png" alt="MRC Logo" className="h-12" />
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">SESSION EXPIRED</h2>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <p className="text-lg text-foreground">
            Your session has expired for security reasons.
          </p>
          <p className="text-muted-foreground">
            Please log in again to continue.
          </p>
        </div>

        {/* Reassurance */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-sm text-foreground">
            Don't worry - your work is auto-saved and will be there when you log back in!
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Button onClick={() => navigate("/")} size="lg" className="gap-2">
            <LogIn className="w-4 h-4" />
            Log In Again
          </Button>
        </div>

        {/* Info */}
        <div className="pt-8 space-y-1">
          <p className="text-sm text-muted-foreground">
            Sessions expire after 24 hours of inactivity for your security.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionExpired;
