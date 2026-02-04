import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import logoLarge from "@/assets/logo-large.png";

// DISABLED FOR SOFT LAUNCH — re-enable when scaling to white-label
// 30-minute lockout after 5 failed attempts is too strict for 4 gloved technicians
// import {
//   isLockedOut,
//   recordFailedAttempt,
//   clearLoginAttempts,
//   getRemainingAttempts,
//   formatLockoutTime,
// } from "@/utils/rateLimiter";

type Role = "Admin" | "Technician" | "Developer";

type ErrorType = "validation" | "auth" | "network" | "lockout" | "role";

interface FormErrors {
  email?: string;
  password?: string;
  auth?: string;
  network?: string;
  type?: ErrorType;
}

/**
 * Translate Supabase/network errors to user-friendly messages
 */
const getErrorMessage = (error: unknown): { message: string; type: ErrorType } => {
  // Handle null/undefined
  if (!error) {
    return { message: "Something went wrong. Please try again.", type: "auth" };
  }

  const err = error as { message?: string; code?: string; status?: number };
  const msg = err.message?.toLowerCase() || "";

  // Network/connection errors
  if (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("net::err")
  ) {
    if (!navigator.onLine) {
      return {
        message: "You appear to be offline. Please check your internet connection.",
        type: "network",
      };
    }
    return {
      message: "Unable to connect to the server. Please check your connection and try again.",
      type: "network",
    };
  }

  // Timeout errors
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return {
      message: "Request timed out. Please try again.",
      type: "network",
    };
  }

  // Supabase auth errors
  if (msg.includes("invalid login credentials") || msg.includes("invalid password")) {
    return {
      message: "The email or password you entered is incorrect.",
      type: "auth",
    };
  }

  if (msg.includes("email not confirmed")) {
    return {
      message: "Please verify your email address before signing in.",
      type: "auth",
    };
  }

  if (msg.includes("too many requests") || msg.includes("rate limit")) {
    return {
      message: "Too many login attempts. Please wait a moment and try again.",
      type: "auth",
    };
  }

  if (msg.includes("user not found")) {
    // Don't reveal if email exists - use generic message
    return {
      message: "The email or password you entered is incorrect.",
      type: "auth",
    };
  }

  if (msg.includes("session") && msg.includes("expired")) {
    return {
      message: "Your session has expired. Please sign in again.",
      type: "auth",
    };
  }

  // Server errors
  if (err.status && err.status >= 500) {
    return {
      message: "Something went wrong on our end. Please try again later.",
      type: "network",
    };
  }

  // Default fallback
  return {
    message: "Something went wrong. Please try again.",
    type: "auth",
  };
};

const Login = () => {
  const { signIn, setCurrentRole, session, userRoles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = (location.state as { message?: string })?.message;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Technician");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  // DISABLED FOR SOFT LAUNCH — re-enable when scaling to white-label
  // const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // DISABLED FOR SOFT LAUNCH — lockout check removed
  // useEffect(() => {
  //   const checkLockout = () => {
  //     const { locked, remainingMs } = isLockedOut();
  //     if (locked) {
  //       setLockoutRemaining(remainingMs);
  //     } else {
  //       setLockoutRemaining(0);
  //     }
  //   };
  //
  //   checkLockout();
  //   const interval = setInterval(checkLockout, 1000);
  //   return () => clearInterval(interval);
  // }, []);

  // SOFT LAUNCH: Form disabled only when loading (no lockout)
  const isFormDisabled = isLoading;

  // Redirect if already logged in with a valid role
  useEffect(() => {
    if (session && userRoles.length > 0) {
      const savedRole = localStorage.getItem("mrc_current_role");
      if (savedRole && userRoles.includes(savedRole)) {
        // Redirect based on saved role
        redirectByRole(savedRole);
      }
    }
  }, [session, userRoles]);

  // Load remembered email and role on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("mrc_remembered_email");
    const savedRole = localStorage.getItem("mrc_selected_role") as Role | null;

    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
    if (savedRole && ["Admin", "Technician", "Developer"].includes(savedRole)) {
      setRole(savedRole);
    }
  }, []);

  // Save role to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("mrc_selected_role", role);
  }, [role]);

  // Clear field errors when user types
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
    if (errors.auth || errors.network) {
      setErrors((prev) => ({ ...prev, auth: undefined, network: undefined }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
    if (errors.auth || errors.network) {
      setErrors((prev) => ({ ...prev, auth: undefined, network: undefined }));
    }
  };

  // Comprehensive form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Please enter your email address";
    } else if (trimmedEmail.length > 254) {
      newErrors.email = "Email address is too long";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Please enter your password";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(newErrors).length > 0) {
      newErrors.type = "validation";
      setErrors(newErrors);
      return false;
    }

    return true;
  };

  // Redirect based on role
  const redirectByRole = (roleName: string) => {
    const lowerRole = roleName.toLowerCase();
    switch (lowerRole) {
      case "developer":
        navigate("/dashboard");
        break;
      case "admin":
        navigate("/admin");
        break;
      case "technician":
        navigate("/technician");
        break;
      default:
        navigate("/dashboard");
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isLoading) {
      return;
    }

    // DISABLED FOR SOFT LAUNCH — lockout check removed
    // const { locked, remainingMs } = isLockedOut();
    // if (locked) {
    //   setErrors({
    //     auth: `Account temporarily locked for security. Try again in ${formatLockoutTime(remainingMs)}.`,
    //     type: "lockout",
    //   });
    //   return;
    // }

    // Reset errors
    setErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Start loading
    setIsLoading(true);

    try {
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem("mrc_remembered_email", email);
      } else {
        localStorage.removeItem("mrc_remembered_email");
      }

      // Sign in - roles are fetched by AuthContext's onAuthStateChange listener
      const { error } = await signIn(email, password, rememberMe);

      if (error) {
        const { message, type } = getErrorMessage(error);
        if (type === "network") {
          setErrors({ network: message, type });
        } else {
          setErrors({ auth: message, type });
        }
        return;
      }

      // Sign in succeeded — set role and redirect
      // Roles are fetched by AuthContext's onAuthStateChange listener
      // RoleProtectedRoute will wait for roles to load before granting access
      setCurrentRole(role.toLowerCase());
      redirectByRole(role.toLowerCase());

    } catch (err) {
      // Handle unexpected errors (network issues, etc.)
      const { message, type } = getErrorMessage(err);
      if (type === "network") {
        setErrors({ network: message, type });
      } else {
        setErrors({ auth: message, type });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const roles: Role[] = ["Admin", "Technician", "Developer"];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: "#f5f7f8",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div className="w-full max-w-[400px]">
        {/* MRC Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-[100px] h-[100px] bg-[#007AFF] rounded-[22px] shadow-lg flex items-center justify-center p-2">
            <img
              src={logoLarge}
              alt="Mould & Restoration Co."
              className="w-[80px] h-[80px] object-contain"
            />
          </div>
        </div>

        {/* Title */}
        <h1
          className="text-center mb-2"
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "#1d1d1f",
            letterSpacing: "-0.5px",
          }}
        >
          MRC internal system
        </h1>

        {/* Subtitle */}
        <p
          className="text-center mb-8"
          style={{
            fontSize: "17px",
            color: "#86868b",
          }}
        >
          Sign in to your workspace
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success Message from Password Reset */}
          {successMessage && (
            <div
              className="p-4 rounded-xl flex items-center gap-3"
              style={{
                backgroundColor: "rgba(52, 199, 89, 0.1)",
                border: "1px solid rgba(52, 199, 89, 0.3)",
              }}
            >
              <span
                className="material-symbols-outlined flex-shrink-0"
                style={{
                  fontSize: "20px",
                  color: "#34C759",
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                check_circle
              </span>
              <p className="text-sm font-medium" style={{ color: "#34C759" }}>
                {successMessage}
              </p>
            </div>
          )}

          {/* DISABLED FOR SOFT LAUNCH — Lockout Warning Banner removed */}

          {/* Network Error Banner */}
          {errors.network && (
            <div
              className="p-3 rounded-xl flex items-center gap-3"
              style={{
                backgroundColor: "rgba(255, 149, 0, 0.1)",
                border: "1px solid rgba(255, 149, 0, 0.3)",
              }}
            >
              <span
                className="material-symbols-outlined flex-shrink-0"
                style={{ fontSize: "20px", color: "#FF9500" }}
              >
                wifi_off
              </span>
              <p className="text-sm" style={{ color: "#CC7700" }}>
                {errors.network}
              </p>
            </div>
          )}

          {/* Role Segmented Control */}
          <div
            className="p-1 rounded-xl"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.06)" }}
          >
            <div className="grid grid-cols-3 gap-1">
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  disabled={isFormDisabled}
                  className={cn(
                    "py-2.5 px-4 rounded-lg text-sm font-medium transition-all min-h-[48px]",
                    role === r ? "bg-white shadow-sm" : "hover:bg-white/50",
                    isFormDisabled && "opacity-50 cursor-not-allowed"
                  )}
                  style={{
                    color: role === r ? "#1d1d1f" : "#86868b",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Email Input */}
          <div>
            <div
              className={cn(
                "relative rounded-xl transition-all",
                errors.email && "bg-red-50/50"
              )}
            >
              <span
                className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2"
                style={{
                  fontSize: "20px",
                  color: errors.email ? "#FF3B30" : "#86868b",
                }}
              >
                mail
              </span>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                disabled={isFormDisabled}
                className={cn(
                  "w-full h-[52px] pl-12 pr-4 rounded-xl bg-white text-base outline-none transition-all",
                  isFormDisabled && "opacity-50 cursor-not-allowed"
                )}
                style={{
                  color: "#1d1d1f",
                  border: errors.email
                    ? "2px solid #FF3B30"
                    : "1px solid #e5e5e5",
                }}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-sm flex items-center gap-1" style={{ color: "#FF3B30" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  error
                </span>
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <div
              className={cn(
                "relative rounded-xl transition-all",
                errors.password && "bg-red-50/50"
              )}
            >
              <span
                className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2"
                style={{
                  fontSize: "20px",
                  color: errors.password ? "#FF3B30" : "#86868b",
                }}
              >
                lock
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                disabled={isFormDisabled}
                className={cn(
                  "w-full h-[52px] pl-12 pr-12 rounded-xl bg-white text-base outline-none transition-all",
                  isFormDisabled && "opacity-50 cursor-not-allowed"
                )}
                style={{
                  color: "#1d1d1f",
                  border: errors.password
                    ? "2px solid #FF3B30"
                    : "1px solid #e5e5e5",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isFormDisabled}
                className={cn(
                  "absolute right-4 top-1/2 -translate-y-1/2",
                  isFormDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "20px", color: "#86868b" }}
                >
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-sm flex items-center gap-1" style={{ color: "#FF3B30" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  error
                </span>
                {errors.password}
              </p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer min-h-[48px]">
              <Switch
                checked={rememberMe}
                onCheckedChange={setRememberMe}
                disabled={isFormDisabled}
                className={cn(
                  "h-[31px] w-[51px] data-[state=checked]:bg-[#34C759] data-[state=unchecked]:bg-[#e5e5e5]",
                  "[&>span]:h-[27px] [&>span]:w-[27px] [&>span]:data-[state=checked]:translate-x-[20px]",
                  "[&>span]:shadow-md [&>span]:bg-white",
                  isFormDisabled && "opacity-50"
                )}
              />
              <span
                className="text-base select-none"
                style={{ color: "#1d1d1f" }}
              >
                Remember me
              </span>
            </label>
            <Link
              to="/forgot-password"
              className="text-base font-medium hover:underline min-h-[48px] flex items-center"
              style={{ color: "#007AFF" }}
            >
              Forgot Password?
            </Link>
          </div>

          {/* Auth Error Message */}
          {errors.auth && (
            <div
              className="p-3 rounded-xl flex items-center gap-3"
              style={{
                backgroundColor:
                  errors.type === "role"
                    ? "rgba(255, 149, 0, 0.1)"
                    : "rgba(255, 59, 48, 0.1)",
                border:
                  errors.type === "role"
                    ? "1px solid rgba(255, 149, 0, 0.3)"
                    : "1px solid rgba(255, 59, 48, 0.3)",
              }}
            >
              <span
                className="material-symbols-outlined flex-shrink-0"
                style={{
                  fontSize: "20px",
                  color: errors.type === "role" ? "#FF9500" : "#FF3B30",
                }}
              >
                {errors.type === "role" ? "person_off" : "error"}
              </span>
              <p
                className="text-sm"
                style={{
                  color: errors.type === "role" ? "#CC7700" : "#FF3B30",
                }}
              >
                {errors.auth}
              </p>
            </div>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isFormDisabled}
            className={cn(
              "w-full h-[52px] rounded-xl text-white text-base font-semibold transition-all flex items-center justify-center gap-2",
              isFormDisabled
                ? "opacity-70 cursor-not-allowed"
                : "hover:opacity-90 active:scale-[0.98]"
            )}
            style={{ backgroundColor: "#007AFF" }}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer */}
        <p
          className="text-center mt-8 text-sm"
          style={{ color: "#86868b" }}
        >
          Don't have an account?{" "}
          <a
            href="mailto:support@mouldco.com.au"
            className="font-medium hover:underline"
            style={{ color: "#007AFF" }}
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
