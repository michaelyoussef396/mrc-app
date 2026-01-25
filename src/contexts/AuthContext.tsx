import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, setRememberMePreference, clearAuthTokens } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { logLoginActivity } from "@/services/loginActivityService";
import {
  createSession,
  endSession,
  forceLogoutAllDevices as forceLogoutAllDevicesService,
  getActiveSessions as getActiveSessionsService,
  getUserDevices as getUserDevicesService,
  removeDevice as removeDeviceService,
  trustDevice as trustDeviceService,
  untrustDevice as untrustDeviceService,
  UserDevice,
  UserSession,
} from "@/services/sessionService";
import { getDeviceInfo } from "@/utils/deviceFingerprint";
import { getLocationInfo, formatLocation } from "@/utils/ipLocation";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRoles: string[];              // ['admin', 'technician', 'developer']
  currentRole: string | null;       // Currently selected role
  setCurrentRole: (role: string) => void;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any; userRoles?: string[] }>;
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [currentRole, setCurrentRoleState] = useState<string | null>(null);
  const navigate = useNavigate();

  /**
   * Fetch user roles using simple direct queries (no RPC)
   * This fixes the timeout issue by avoiding complex RPC calls
   */
  const fetchUserRoles = useCallback(async (userId: string): Promise<string[]> => {
    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Simple query: get role_ids from user_roles
      const { data: userRoleData, error: userRoleError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId);

      clearTimeout(timeoutId);

      if (userRoleError) {
        console.error('Error fetching user_roles:', userRoleError);
        return [];
      }

      if (!userRoleData || userRoleData.length === 0) {
        console.log('No roles found for user');
        return [];
      }

      // Get role names from roles table
      const roleIds = userRoleData.map(r => r.role_id).filter(Boolean);

      if (roleIds.length === 0) {
        return [];
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('name')
        .in('id', roleIds);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return [];
      }

      if (!rolesData) {
        return [];
      }

      const roleNames = rolesData.map(r => r.name).filter(Boolean) as string[];
      console.log('Fetched roles:', roleNames);
      return roleNames;

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error('Role fetch timed out');
      } else {
        console.error('Error in fetchUserRoles:', err);
      }
      return [];
    }
  }, []);

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

    // Fallback timeout - never stay loading forever (10 seconds max)
    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ [Auth] Loading timeout - forcing completion');
        setLoading(false);
      }
    }, 10000);

    // Initialize auth state
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch roles with timeout protection
          const roles = await Promise.race([
            fetchUserRoles(session.user.id),
            new Promise<string[]>((resolve) =>
              setTimeout(() => {
                console.warn('⚠️ [Auth] Role fetch timeout');
                resolve([]);
              }, 5000)
            )
          ]);

          if (mounted) {
            setUserRoles(roles);

            // Restore current role from localStorage
            const savedRole = localStorage.getItem('mrc_current_role');
            if (savedRole && roles.includes(savedRole.toLowerCase())) {
              setCurrentRoleState(savedRole.toLowerCase());
            }
          }
        }

        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ [Auth] Init error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch roles with timeout protection
          const roles = await Promise.race([
            fetchUserRoles(session.user.id),
            new Promise<string[]>((resolve) =>
              setTimeout(() => resolve([]), 5000)
            )
          ]);

          if (mounted) {
            setUserRoles(roles);

            // Restore current role from localStorage if available
            const savedRole = localStorage.getItem('mrc_current_role');
            if (savedRole && roles.includes(savedRole.toLowerCase())) {
              setCurrentRoleState(savedRole.toLowerCase());
            }
          }
        } else {
          setUserRoles([]);
          setCurrentRoleState(null);
        }

        if (mounted) {
          setLoading(false);
        }

        if (event === 'SIGNED_OUT') {
          navigate('/');
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [fetchUserRoles, navigate]);

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      // Set the remember me preference BEFORE signing in
      setRememberMePreference(rememberMe);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Schedule failed login logging in background (non-blocking)
        setTimeout(() => {
          logLoginActivity({
            userId: data?.user?.id,
            email,
            success: false,
            errorMessage: error.message,
          }).catch(console.error);
        }, 0);

        return { error, userRoles: [] };
      }

      // Fetch user roles after successful sign in
      if (data.user) {
        const roles = await fetchUserRoles(data.user.id);
        setUserRoles(roles);

        // Schedule ALL security logging in background after login completes
        // This ensures login redirect happens immediately
        setTimeout(() => {
          // Log successful login activity
          logLoginActivity({
            userId: data.user!.id,
            email,
            success: true,
          }).catch(console.error);

          // Create session record with device/location tracking
          (async () => {
            try {
              const [deviceInfo, locationInfo] = await Promise.all([
                getDeviceInfo().catch(() => null),
                getLocationInfo().catch(() => null),
              ]);

              if (deviceInfo && data.session) {
                // Get device ID from database
                const { data: deviceData } = await supabase
                  .from('user_devices')
                  .select('id')
                  .eq('user_id', data.user!.id)
                  .eq('device_fingerprint', deviceInfo.fingerprint)
                  .maybeSingle();

                await createSession(
                  data.user!.id,
                  deviceData?.id || null,
                  data.session.access_token,
                  locationInfo?.ip,
                  locationInfo ? formatLocation(locationInfo) : undefined
                );
              }
            } catch (err) {
              console.error('Error creating session record:', err);
            }
          })();
        }, 0);

        return { error: null, userRoles: roles };
      }

      return { error: null, userRoles: [] };
    } catch (error) {
      // Schedule failed login logging in background
      setTimeout(() => {
        logLoginActivity({
          email,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        }).catch(console.error);
      }, 0);

      return { error, userRoles: [] };
    }
  };

  const signOut = async () => {
    // End session record if exists
    if (user && session) {
      endSession(user.id, session.access_token, 'logout').catch(console.error);
    }

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
