import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import logoMRC from "@/assets/logoMRC.png";
import { Copy, Info } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Demo Credentials Box */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3">
              <h3 className="font-semibold text-amber-900 text-sm sm:text-base">
                DEMO LOGIN CREDENTIALS
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 bg-white/60 rounded-lg p-2 sm:p-3">
                  <div className="flex-1">
                    <p className="text-xs text-amber-700 font-medium mb-1">Email</p>
                    <p className="font-mono text-xs sm:text-sm text-amber-900">admin@mrc.com.au</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-amber-100"
                    onClick={() => copyToClipboard('admin@mrc.com.au', 'Email')}
                  >
                    <Copy className="h-3.5 w-3.5 text-amber-600" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between gap-2 bg-white/60 rounded-lg p-2 sm:p-3">
                  <div className="flex-1">
                    <p className="text-xs text-amber-700 font-medium mb-1">Password</p>
                    <p className="font-mono text-xs sm:text-sm text-amber-900">Admin123!</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-amber-100"
                    onClick={() => copyToClipboard('Admin123!', 'Password')}
                  >
                    <Copy className="h-3.5 w-3.5 text-amber-600" />
                  </Button>
                </div>
              </div>
              
              <p className="text-xs text-amber-700 italic">
                (For testing purposes)
              </p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with Primary Color */}
          <div className="bg-primary px-6 sm:px-8 py-8 sm:py-10 text-center">
            <div className="inline-block mb-3">
              <img 
                src={logoMRC} 
                alt="Mould & Restoration Co." 
                className="h-20 sm:h-24"
              />
            </div>
            <p className="text-base sm:text-lg text-primary-foreground font-medium">Internal System</p>
          </div>

          {/* Form Section */}
          <div className="p-6 sm:p-8">

            {/* Login Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-semibold">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your.email@example.com"
                          className="h-12 sm:h-13 text-base border-2 focus:border-primary transition-colors"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-semibold">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          className="h-12 sm:h-13 text-base border-2 focus:border-primary transition-colors"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-1">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="h-5 w-5"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer text-foreground">
                        Remember me
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 sm:h-13 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </Form>

            {/* Forgot Password Link */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                Forgot password?
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
