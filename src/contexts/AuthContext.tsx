import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, setRememberMePreference, clearAuthTokens } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

import { useNavigate } from "react-router-dom";

// DISABLED FOR SOFT LAUNCH — re-enable when scaling to white-label
// These features add external API calls (FingerprintJS, 3 IP geolocation APIs) on every login
// import { logLoginActivity } from "@/services/loginActivityService";
// import { getDeviceInfo } from "@/utils/deviceFingerprint";
// import { getLocationInfo, formatLocation } from "@/utils/ipLocation";

import {
  // createSession,  // DISABLED FOR SOFT LAUNCH
  // endSession,     // DISABLED FOR SOFT LAUNCH
  forceLogoutAllDevices as forceLogoutAllDevicesService,
  getActiveSessions as getActiveSessionsService,
  getUserDevices as getUserDevicesService,
  removeDevice as removeDeviceService,
  trustDevice as trustDeviceService,
  untrustDevice as untrustDeviceService,
  UserDevice,
  UserSession,
} from "@/services/sessionService";

interface AuthContextType {
  user: User | null;
  profile: Database['public']['Tables']['profiles']['Row'] | null;

  session: Session | null;
  loading: boolean;
  userRoles: string[];              // ['admin', 'technician', 'developer']
  currentRole: string | null;       // Currently selected role
  setCurrentRole: (role: string) => void;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  hasRole: (role: string) => boolean;
  // Session & Device Management
  forceLogoutAllDevices: (exceptCurrent?: boolean) => Promise<void>;
  getActiveSessions: () => Promise<UserSession[]>;
  getUserDevices: () => Promise<UserDevice[]>;
  removeDevice: (deviceId: string) => Promise<boolean>;
  trustDevice: (deviceId: string) => Promise<boolean>;
  untrustDevice: (deviceId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [currentRole, setCurrentRoleState] = useState<string | null>(null);
  const navigate = useNavigate();

  // Set current role and persist to localStorage
  const setCurrentRole = useCallback((role: string) => {
    setCurrentRoleState(role);
    localStorage.setItem('mrc_current_role', role);
  }, []);

  // Check if user has specific role
  const hasRole = useCallback((role: string): boolean => {
    return userRoles.includes(role.toLowerCase());
  }, [userRoles]);

  useEffect(() => {
    let mounted = true;

    // Single unified auth state listener - handles ALL auth events including initial load
    // Following Supabase best practice: onAuthStateChange fires INITIAL_SESSION on mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        // Synchronously update session/user state
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch roles without blocking the auth state change callback
          const userId = session.user.id;

          // Use async IIFE inside setTimeout to not block Supabase
          setTimeout(async () => {
            if (!mounted) {
              return;
            }

            try {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

              if (!profileError) setProfile(profileData);

              const { data: userRoleData, error: userRoleError } = await supabase
                .from('user_roles')
                .select('role_id')
                .eq('user_id', userId);

              if (!mounted) return;
              if (userRoleError || !userRoleData?.length) {
                setLoading(false);
                return;
              }

              const roleIds = userRoleData.map(r => r.role_id).filter(Boolean);

              const { data: rolesData, error: rolesError } = await supabase
                .from('roles')
                .select('name')
                .in('id', roleIds);

              if (!mounted) return;

              const roleNames = (rolesData || []).map(r => r.name).filter(Boolean) as string[];
              setUserRoles(roleNames);

              const savedRole = localStorage.getItem('mrc_current_role');
              if (savedRole && roleNames.includes(savedRole.toLowerCase())) {
                setCurrentRoleState(savedRole.toLowerCase());
              }

              setLoading(false);
            } catch (err) {
              console.error('[Auth] Exception:', err);
              if (mounted) setLoading(false);
            }
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setUserRoles([]);
          setProfile(null);
          setCurrentRoleState(null);
          setLoading(false);
          navigate('/');
        } else {
          // No session (initial load with no auth, or other events)
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      // Set the remember me preference BEFORE signing in
      setRememberMePreference(rememberMe);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Don't fetch roles here — onAuthStateChange SIGNED_IN handler already does it
      // Just return success. The roles will be set by the auth state listener.
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    // DISABLED FOR SOFT LAUNCH — re-enable when scaling to white-label
    // if (user && session) {
    //   endSession(user.id, session.access_token, 'logout').catch(console.error);
    // }

    // Clear auth tokens and role state
    clearAuthTokens();
    localStorage.removeItem('mrc_current_role');
    setUserRoles([]);
    setCurrentRoleState(null);
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

  // Force logout from all devices
  const forceLogoutAllDevices = async (exceptCurrent: boolean = true) => {
    if (!user) return;

    const currentSessionToken = exceptCurrent ? session?.access_token : undefined;
    await forceLogoutAllDevicesService(user.id, currentSessionToken);

    if (!exceptCurrent) {
      await signOut();
    }
  };

  // Get all active sessions
  const getActiveSessions = async (): Promise<UserSession[]> => {
    if (!user) return [];
    return getActiveSessionsService(user.id);
  };

  // Get all user devices
  const getUserDevices = async (): Promise<UserDevice[]> => {
    if (!user) return [];
    return getUserDevicesService(user.id);
  };

  // Remove a device
  const removeDevice = async (deviceId: string): Promise<boolean> => {
    if (!user) return false;
    return removeDeviceService(user.id, deviceId);
  };

  // Trust a device
  const trustDevice = async (deviceId: string): Promise<boolean> => {
    if (!user) return false;
    return trustDeviceService(user.id, deviceId);
  };

  // Untrust a device
  const untrustDevice = async (deviceId: string): Promise<boolean> => {
    if (!user) return false;
    return untrustDeviceService(user.id, deviceId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        userRoles,
        currentRole,
        setCurrentRole,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        hasRole,
        forceLogoutAllDevices,
        getActiveSessions,
        getUserDevices,
        removeDevice,
        trustDevice,
        untrustDevice,
      }}
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
