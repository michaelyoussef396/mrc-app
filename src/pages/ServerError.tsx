import { useNavigate } from "react-router-dom";
import { AlertTriangle, RefreshCw, Home, ArrowLeft, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const ServerError = () => {
  const navigate = useNavigate();
  const [errorId, setErrorId] = useState("");

  useEffect(() => {
    // Generate error ID for support reference
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    setErrorId(`ERR-${timestamp}`);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    navigate(-1);
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
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
        </div>

        {/* Error Code */}
        <div className="space-y-2">
          <h1 className="text-7xl font-bold text-muted-foreground">500</h1>
          <h2 className="text-3xl font-bold text-foreground">SOMETHING WENT WRONG</h2>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <p className="text-lg text-foreground">
            We're sorry, something went wrong on our end.
          </p>
          <p className="text-muted-foreground">
            Our team has been notified and we're working to fix the issue.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">What you can do:</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleRefresh} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </Button>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="gap-2">
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Button>
            <Button onClick={handleGoBack} variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
          </div>
        </div>

        {/* Contact Support */}
        <div className="pt-8 space-y-4">
          <p className="text-sm font-medium text-foreground">If the problem persists:</p>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4" />
              <a href="tel:1300665673" className="hover:text-foreground transition-colors">
                Call us: 1300 665 673
              </a>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <a href="mailto:support@mrc.com.au" className="hover:text-foreground transition-colors">
                Email: support@mrc.com.au
              </a>
            </div>
          </div>
          
          {/* Error ID */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">Error ID: {errorId}</p>
            <p className="text-xs text-muted-foreground mt-1">
              (Please reference this when contacting support)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerError;
