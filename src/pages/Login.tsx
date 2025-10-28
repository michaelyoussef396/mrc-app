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
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with Primary Color */}
          <div className="bg-primary px-6 sm:px-8 py-8 sm:py-10 text-center">
            <div className="inline-block mb-4">
              <img 
                src={logoMRC} 
                alt="Mould & Restoration Co." 
                className="h-20 sm:h-24"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary-foreground mb-2">
              MOULD & RESTORATION CO.
            </h1>
            <p className="text-sm sm:text-base text-primary-foreground/90">Internal System</p>
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
