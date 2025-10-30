import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Lock, ArrowRight, User, Wrench } from "lucide-react";
import Logo from "@/components/Logo";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const fillCredentials = (email: string, password: string) => {
    form.setValue('email', email);
    form.setValue('password', password);
    toast({
      title: "Credentials filled",
      description: "Click Sign In to login",
      duration: 2000,
    });
  };

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);

      if (error) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: error.message || "Invalid email or password",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated Gradient Background */}
      <div className="login-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
      
      {/* Login Container */}
      <div className="login-container">
        {/* Login Card (Glass) */}
        <div className="login-card glass-card">
          {/* Logo & Header */}
          <div className="login-header">
            <div className="logo-container">
              <div className="logo-circle">
                <Logo size="large" />
              </div>
            </div>
            <h1 className="login-title">Mould & Restoration Co.</h1>
            <p className="login-subtitle">Lead Management System</p>
          </div>
          
          {/* Login Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="login-form">
            {/* Email Field */}
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={20} />
                <input
                  type="email"
                  className="form-input"
                  placeholder="your@email.com"
                  {...form.register('email')}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
            
            {/* PASSWORD FIELD - REBUILT */}
            <div className="form-group">
              <label className="form-label">Password</label>
              {/* Container holds lock, input and eye icon together */}
              <div className="password-input-container">
                <span className="icon-left"><Lock size={18} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="password-input-field"
                  placeholder="Enter your password"
                  {...form.register('password')}
                />
                <button
                  type="button"
                  className="icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>
            
            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn-login btn-primary-gradient"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="btn-arrow" size={20} />
                </>
              )}
            </button>
            
            {/* Forgot Password Link */}
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="forgot-link"
            >
              Forgot password?
            </button>
          </form>
          
          {/* Footer */}
          <div className="login-footer">
            <p className="footer-text">
              Melbourne's trusted mould specialists
            </p>
          </div>
        </div>
        
        {/* Test Credentials (Dev only) */}
        <div className="test-credentials glass-card">
          <p className="test-title">Demo Accounts:</p>
          <button 
            type="button"
            className="test-account-btn"
            onClick={() => fillCredentials('admin@mrc.com.au', 'Admin123!')}
          >
            <User size={16} className="inline mr-2" />
            Admin Account
          </button>
          <button 
            type="button"
            className="test-account-btn"
            onClick={() => fillCredentials('michaelyoussef396@gmail.com', 'Admin123!')}
          >
            <Wrench size={16} className="inline mr-2" />
            Technician (Michael)
          </button>
        </div>
      </div>
    </div>
  );
}
