import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // NOTE: seed-admin function call removed - admin user already exists
    // If needed in future, use: import.meta.env.VITE_SUPABASE_ANON_KEY for auth

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Only auto-navigate to dashboard for normal sign-ins, not password recovery or session restoration
        if (event === 'SIGNED_IN') {
          // Check if this is a password recovery session
          // Method 1: Check current pathname
          const onResetPasswordPage = window.location.pathname === '/reset-password';

          // Method 2: Check URL hash for recovery type (more reliable)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const isRecoveryHash = hashParams.get('type') === 'recovery';

          // Method 3: Check if access_token exists in hash (indicates recovery flow)
          const hasAccessToken = hashParams.has('access_token');

          const isPasswordRecovery = onResetPasswordPage || isRecoveryHash ||
                                      (hasAccessToken && window.location.pathname === '/reset-password');

          // Only redirect to dashboard if it's NOT a password recovery flow AND user is on login page
          // This prevents redirecting away from other pages when session is restored on page reload
          const isOnLoginPage = window.location.pathname === '/' || window.location.pathname === '/login';

          if (!isPasswordRecovery && isOnLoginPage) {
            navigate('/dashboard');
          }
        }

        if (event === 'SIGNED_OUT') {
          navigate('/');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signOut, resetPassword, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
