import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, KeyRound, Mail } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    try {
      const { error } = await resetPassword(data.email);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to send reset email",
        });
        setIsLoading(false);
      } else {
        // Redirect to check email page with email in state
        navigate("/check-email", { state: { email: data.email } });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      {/* Animated Gradient Background */}
      <div className="forgot-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
      
      {/* Content Card */}
      <div className="forgot-container">
        <div className="forgot-card glass-card">
          {/* Header */}
          <div className="forgot-header">
            <button 
              className="back-button"
              onClick={() => navigate("/")}
              type="button"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </button>
            
            <div className="icon-container">
              <div className="forgot-icon">
                <KeyRound className="w-10 h-10 text-white" strokeWidth={2.5} />
              </div>
            </div>
            
            <h1 className="forgot-title">Reset Password</h1>
            <p className="forgot-subtitle">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
          </div>
          
          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="forgot-form">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="form-label">Email Address</FormLabel>
                    <FormControl>
                      <div className="email-input-container">
                        <Mail className="email-icon-svg" />
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          className="email-input-field"
                          autoFocus
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                className="btn-submit btn-primary-gradient w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight className="w-5 h-5 btn-arrow" />
                  </>
                )}
              </Button>
            </form>
          </Form>
          
          {/* Footer */}
          <div className="forgot-footer">
            <p className="footer-text">
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => navigate("/")}
                className="footer-link"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
