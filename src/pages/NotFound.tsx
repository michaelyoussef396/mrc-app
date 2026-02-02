import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const navigate = useNavigate();
  const { user, currentRole } = useAuth();

  // Determine the correct dashboard URL based on user role
  const getDashboardUrl = () => {
    if (!user) return "/";

    switch (currentRole) {
      case "admin":
        return "/admin";
      case "technician":
        return "/technician";
      case "developer":
      default:
        return "/dashboard";
    }
  };

  const getDashboardLabel = () => {
    if (!user) return "Go to Login";
    return "Go to Dashboard";
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ backgroundColor: "#f5f7f8" }}
    >
      {/* Main Content Container */}
      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img
            src="/src/assets/logoMRC.png"
            alt="MRC Logo"
            className="h-10"
          />
        </div>

        {/* Icon Container */}
        <div className="flex justify-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#e8e8ed" }}
          >
            <span
              className="material-symbols-outlined text-4xl"
              style={{ color: "#86868b" }}
            >
              search_off
            </span>
          </div>
        </div>

        {/* Error Code & Message */}
        <div className="space-y-2">
          <h1
            className="text-6xl font-bold tracking-tight"
            style={{ color: "#1d1d1f" }}
          >
            404
          </h1>
          <h2
            className="text-xl font-semibold"
            style={{ color: "#1d1d1f" }}
          >
            Page Not Found
          </h2>
        </div>

        {/* Description */}
        <p
          className="text-base leading-relaxed"
          style={{ color: "#86868b" }}
        >
          The page you're looking for doesn't exist or may have been moved.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          {/* Primary Button - Go to Dashboard (role-aware) */}
          <button
            onClick={() => navigate(getDashboardUrl())}
            className="w-full h-14 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "#007AFF" }}
          >
            <span className="material-symbols-outlined text-xl">home</span>
            <span>{getDashboardLabel()}</span>
          </button>

          {/* Secondary Button - Go Back */}
          <button
            onClick={() => navigate(-1)}
            className="w-full h-14 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80 active:scale-[0.98]"
            style={{
              backgroundColor: "transparent",
              color: "#007AFF",
              border: "2px solid #007AFF"
            }}
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            <span>Go Back</span>
          </button>
        </div>

        {/* Quick Assistance Section */}
        <div
          className="pt-6 border-t mt-6"
          style={{ borderColor: "#d2d2d7" }}
        >
          <p
            className="text-sm font-medium mb-4"
            style={{ color: "#1d1d1f" }}
          >
            Quick Assistance
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Phone Support */}
            <a
              href="tel:1300665673"
              className="flex items-center justify-center gap-2 p-3 rounded-xl transition-all hover:opacity-80"
              style={{ backgroundColor: "#e8e8ed" }}
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{ color: "#007AFF" }}
              >
                phone
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: "#1d1d1f" }}
              >
                Call Support
              </span>
            </a>

            {/* Email Support */}
            <a
              href="mailto:support@mrc.com.au"
              className="flex items-center justify-center gap-2 p-3 rounded-xl transition-all hover:opacity-80"
              style={{ backgroundColor: "#e8e8ed" }}
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{ color: "#007AFF" }}
              >
                mail
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: "#1d1d1f" }}
              >
                Email Us
              </span>
            </a>
          </div>
        </div>

        {/* Footer Contact Info */}
        <div className="pt-4">
          <p
            className="text-xs"
            style={{ color: "#86868b" }}
          >
            1300 665 673 | support@mrc.com.au
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
