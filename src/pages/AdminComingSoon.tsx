import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminComingSoon() {
  const { signOut, user } = useAuth();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        backgroundColor: "#f5f7f8",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div className="text-center max-w-md">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: "rgba(0, 122, 255, 0.1)" }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: "40px",
              color: "#007AFF",
              fontVariationSettings: "'FILL' 1",
            }}
          >
            admin_panel_settings
          </span>
        </div>

        {/* Title */}
        <h1
          className="mb-2"
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#1d1d1f",
            letterSpacing: "-0.5px",
          }}
        >
          Admin Dashboard
        </h1>

        {/* Subtitle */}
        <p
          className="mb-2"
          style={{
            fontSize: "17px",
            color: "#86868b",
          }}
        >
          Coming Soon
        </p>

        {/* User info */}
        {user && (
          <p
            className="mb-8"
            style={{
              fontSize: "14px",
              color: "#86868b",
            }}
          >
            Logged in as {user.email}
          </p>
        )}

        {/* Description */}
        <div
          className="p-4 rounded-xl mb-8"
          style={{
            backgroundColor: "rgba(0, 122, 255, 0.05)",
            border: "1px solid rgba(0, 122, 255, 0.1)",
          }}
        >
          <p style={{ color: "#1d1d1f", fontSize: "15px", lineHeight: 1.5 }}>
            The Admin portal is currently under development. You'll soon be able
            to manage leads, view reports, assign work to technicians, and more.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 h-[48px] px-6 rounded-xl font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: "#007AFF",
              color: "white",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              arrow_back
            </span>
            Back to Login
          </Link>

          <button
            onClick={signOut}
            className="inline-flex items-center justify-center gap-2 h-[48px] px-6 rounded-xl font-medium transition-all hover:bg-gray-100"
            style={{
              backgroundColor: "transparent",
              color: "#FF3B30",
              border: "1px solid #FF3B30",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              logout
            </span>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
