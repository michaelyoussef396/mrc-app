import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const location = useLocation();
  const email = location.state?.email || "";
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const { toast } = useToast();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  // Password strength calculation
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "",
    color: "",
    checks: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    }
  });
  
  useEffect(() => {
    calculatePasswordStrength(password);
  }, [password]);
  
  const calculatePasswordStrength = (pwd: string) => {
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    
    let label = "";
    let color = "";
    
    if (score === 0) {
      label = "";
      color = "";
    } else if (score <= 2) {
      label = "Weak";
      color = "#ef4444";
    } else if (score === 3) {
      label = "Fair";
      color = "#f59e0b";
    } else if (score === 4) {
      label = "Good";
      color = "#3b82f6";
    } else {
      label = "Strong";
      color = "#10b981";
    }
    
    setPasswordStrength({ score, label, color, checks });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (passwordStrength.score < 3) {
      setError("Please choose a stronger password");
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await updatePassword(password);
      
      if (error) throw error;
      
      setSuccess(true);
      
      toast({
        title: "Password Reset!",
        description: "Your password has been successfully reset.",
      });
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };
  
  if (success) {
    return (
      <div className="reset-password-page">
        <div className="reset-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
          <div className="gradient-orb orb-4"></div>
        </div>
        
        <div className="reset-container">
          <div className="reset-card glass-card">
            {/* Success State */}
            <div className="success-state">
              <div className="success-icon-wrapper">
                <div className="success-icon-circle-reset">
                  <svg 
                    className="checkmark-svg" 
                    viewBox="0 0 52 52"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle 
                      className="checkmark-circle" 
                      cx="26" 
                      cy="26" 
                      r="25" 
                      fill="none"
                    />
                    <path 
                      className="checkmark-check" 
                      fill="none" 
                      d="M14.1 27.2l7.1 7.2 16.7-16.8"
                    />
                  </svg>
                </div>
              </div>
              
              <h1 className="success-title-reset">Password Reset!</h1>
              <p className="success-message-reset">
                Your password has been successfully reset.
              </p>
              <p className="success-redirect">
                Redirecting to login...
              </p>
              
              <div className="redirect-loader">
                <div className="loader-bar"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="reset-password-page">
      {/* Blue Animated Background */}
      <div className="reset-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="gradient-orb orb-4"></div>
      </div>
      
      {/* Content Card */}
      <div className="reset-container">
        <div className="reset-card glass-card">
          {/* Icon */}
          <div className="reset-icon-wrapper">
            <div className="reset-icon">
              <span className="icon-emoji">🔒</span>
            </div>
          </div>
          
          {/* Header */}
          <div className="reset-header">
            <h1 className="reset-title">Create New Password</h1>
            <p className="reset-subtitle">
              Your new password must be different from previously used passwords
            </p>
          </div>
          
          {/* Form */}
          <form className="reset-form" onSubmit={handleSubmit}>
            {error && (
              <div className="error-message-reset">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}
            
            {/* New Password */}
            <div className="form-group-reset">
              <label className="form-label-reset">New Password</label>
              <div className="input-wrapper-reset">
                <span className="input-icon-reset">🔑</span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input-reset"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  className="input-toggle-reset"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Strength Meter */}
              {password && (
                <div className="password-strength">
                  <div className="strength-bar-container">
                    <div 
                      className="strength-bar"
                      style={{
                        width: `${(passwordStrength.score / 5) * 100}%`,
                        backgroundColor: passwordStrength.color
                      }}
                    />
                  </div>
                  <p 
                    className="strength-label"
                    style={{ color: passwordStrength.color }}
                  >
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>
            
            {/* Confirm Password */}
            <div className="form-group-reset">
              <label className="form-label-reset">Confirm Password</label>
              <div className="input-wrapper-reset">
                <span className="input-icon-reset">🔑</span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-input-reset"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-toggle-reset"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Match Indicator */}
              {confirmPassword && (
                <div className={`match-indicator ${password === confirmPassword ? "match" : "no-match"}`}>
                  <span className="match-icon">
                    {password === confirmPassword ? "✓" : "✗"}
                  </span>
                  <span className="match-text">
                    {password === confirmPassword ? "Passwords match" : "Passwords do not match"}
                  </span>
                </div>
              )}
            </div>
            
            {/* Password Requirements */}
            <div className="password-requirements">
              <p className="requirements-title">Password must contain:</p>
              <ul className="requirements-list">
                <li className={passwordStrength.checks.length ? "met" : ""}>
                  <span className="check-icon-req">{passwordStrength.checks.length ? "✓" : "○"}</span>
                  <span>At least 8 characters</span>
                </li>
                <li className={passwordStrength.checks.uppercase ? "met" : ""}>
                  <span className="check-icon-req">{passwordStrength.checks.uppercase ? "✓" : "○"}</span>
                  <span>One uppercase letter</span>
                </li>
                <li className={passwordStrength.checks.lowercase ? "met" : ""}>
                  <span className="check-icon-req">{passwordStrength.checks.lowercase ? "✓" : "○"}</span>
                  <span>One lowercase letter</span>
                </li>
                <li className={passwordStrength.checks.number ? "met" : ""}>
                  <span className="check-icon-req">{passwordStrength.checks.number ? "✓" : "○"}</span>
                  <span>One number</span>
                </li>
                <li className={passwordStrength.checks.special ? "met" : ""}>
                  <span className="check-icon-req">{passwordStrength.checks.special ? "✓" : "○"}</span>
                  <span>One special character</span>
                </li>
              </ul>
            </div>
            
            {/* Submit Button */}
            <Button
              type="submit"
              className="btn-reset-submit btn-primary-gradient w-full"
              size="lg"
              disabled={loading || passwordStrength.score < 3 || password !== confirmPassword}
            >
              {loading ? (
                <>
                  <span className="loading-spinner-reset"></span>
                  <span>Resetting Password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-5 h-5 btn-arrow-reset" />
                </>
              )}
            </Button>
          </form>
          
          {/* Back to Login */}
          <div className="reset-footer">
            <Button
              variant="ghost"
              className="btn-back-login-reset"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4 back-arrow-reset" />
              <span>Back to Login</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
