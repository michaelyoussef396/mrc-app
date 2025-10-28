import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Home, FileText, Calendar, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const NotFound = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/src/assets/logoMRC.png" alt="MRC Logo" className="h-12" />
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Search className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>

        {/* Error Code */}
        <div className="space-y-2">
          <h1 className="text-7xl font-bold text-muted-foreground">404</h1>
          <h2 className="text-3xl font-bold text-foreground">PAGE NOT FOUND</h2>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <p className="text-lg text-foreground">
            Oops! We can't find that page.
          </p>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or may have been moved.
          </p>
        </div>

        {/* Action Links */}
        {user ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">Here are some helpful links:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button onClick={() => navigate("/dashboard")} className="gap-2">
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Button>
              <Button onClick={() => navigate("/leads")} variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                View Leads
              </Button>
              <Button onClick={() => navigate("/calendar")} variant="outline" className="gap-2">
                <Calendar className="w-4 h-4" />
                Check Calendar
              </Button>
              <Button onClick={() => window.location.href = "tel:1300665673"} variant="outline" className="gap-2">
                <Phone className="w-4 h-4" />
                Contact Support
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button onClick={() => navigate("/")} className="gap-2">
              <Home className="w-4 h-4" />
              Go to Login
            </Button>
          </div>
        )}

        {/* Search Bar */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Or search for what you need:</p>
          <div className="max-w-md mx-auto">
            <Input 
              placeholder="Search..." 
              className="w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && user) {
                  navigate('/dashboard');
                }
              }}
            />
          </div>
        </div>

        {/* Contact Info */}
        <div className="pt-8 space-y-1">
          <p className="text-sm font-medium text-foreground">Need help?</p>
          <p className="text-sm text-muted-foreground">
            📞 1300 665 673 | 📧 support@mrc.com.au
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
