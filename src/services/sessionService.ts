/**
 * Session Management Service
 *
 * Handles user sessions, active device management,
 * and force logout capabilities.
 */

import { supabase } from '@/integrations/supabase/client';

export interface UserDevice {
  id: string;
  user_id: string;
  device_fingerprint: string;
  device_name: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  is_trusted: boolean;
  is_current: boolean;
  last_used_at: string;
  first_ip: string | null;
  first_location: string | null;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  device_id: string | null;
  session_token: string;
  is_active: boolean;
  ip_address: string | null;
  location: string | null;
  started_at: string;
  last_activity_at: string;
  ended_at: string | null;
  end_reason: string | null;
  created_at: string;
  user_devices?: UserDevice;
}

/**
 * Create a new session record
 */
export const createSession = async (
  userId: string,
  deviceId: string | null,
  sessionToken: string,
  ipAddress?: string,
  location?: string
): Promise<string | null> => {
  try {
    // End any existing active sessions on this device
    if (deviceId) {
      await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          end_reason: 'new_session',
        })
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .eq('is_active', true);
    }

    // Create new session
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        device_id: deviceId,
        session_token: sessionToken,
        ip_address: ipAddress || null,
        location: location || null,
        is_active: true,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error in createSession:', error);
    return null;
  }
};

/**
 * End a specific session
 */
export const endSession = async (
  userId: string,
  sessionToken: string,
  reason: string = 'logout'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
        end_reason: reason,
      })
      .eq('user_id', userId)
      .eq('session_token', sessionToken);

    if (error) {
      console.error('Error ending session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in endSession:', error);
    return false;
  }
};

/**
 * End a session by session ID
 */
export const endSessionById = async (
  userId: string,
  sessionId: string,
  reason: string = 'force_logout'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
        end_reason: reason,
      })
      .eq('user_id', userId)
      .eq('id', sessionId);

    if (error) {
      console.error('Error ending session by ID:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in endSessionById:', error);
    return false;
  }
};

/**
 * Force logout from all devices
 */
export const forceLogoutAllDevices = async (
  userId: string,
  exceptCurrentSession?: string
): Promise<boolean> => {
  try {
    let query = supabase
      .from('user_sessions')
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
        end_reason: 'force_logout',
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (exceptCurrentSession) {
      query = query.neq('session_token', exceptCurrentSession);
    }

    const { error } = await query;

    if (error) {
      console.error('Error forcing logout:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in forceLogoutAllDevices:', error);
    return false;
  }
};

/**
 * Get all active sessions for a user
 */
export const getActiveSessions = async (userId: string): Promise<UserSession[]> => {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select(`
        *,
        user_devices (
          id,
          device_name,
          device_type,
          browser,
          os,
          is_trusted,
          is_current
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_activity_at', { ascending: false });

    if (error) {
      console.error('Error fetching active sessions:', error);
      return [];
    }

    return data as UserSession[];
  } catch (error) {
    console.error('Error in getActiveSessions:', error);
    return [];
  }
};

/**
 * Get all devices for a user
 */
export const getUserDevices = async (userId: string): Promise<UserDevice[]> => {
  try {
    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false });

    if (error) {
      console.error('Error fetching user devices:', error);
      return [];
    }

    return data as UserDevice[];
  } catch (error) {
    console.error('Error in getUserDevices:', error);
    return [];
  }
};

/**
 * Remove a device and end all its sessions
 */
export const removeDevice = async (
  userId: string,
  deviceId: string
): Promise<boolean> => {
  try {
    // End all sessions on this device
    await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
        end_reason: 'device_removed',
      })
      .eq('user_id', userId)
      .eq('device_id', deviceId);

    // Delete the device
    const { error } = await supabase
      .from('user_devices')
      .delete()
      .eq('user_id', userId)
      .eq('id', deviceId);

    if (error) {
      console.error('Error removing device:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeDevice:', error);
    return false;
  }
};

/**
 * Trust a device (mark as trusted)
 */
export const trustDevice = async (
  userId: string,
  deviceId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_devices')
      .update({ is_trusted: true })
      .eq('user_id', userId)
      .eq('id', deviceId);

    if (error) {
      console.error('Error trusting device:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in trustDevice:', error);
    return false;
  }
};

/**
 * Untrust a device
 */
export const untrustDevice = async (
  userId: string,
  deviceId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_devices')
      .update({ is_trusted: false })
      .eq('user_id', userId)
      .eq('id', deviceId);

    if (error) {
      console.error('Error untrusting device:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in untrustDevice:', error);
    return false;
  }
};

/**
 * Update session activity timestamp
 */
export const updateSessionActivity = async (
  userId: string,
  sessionToken: string
): Promise<void> => {
  try {
    await supabase
      .from('user_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('session_token', sessionToken)
      .eq('is_active', true);
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
};

/**
 * Get current device info from session
 */
export const getCurrentDevice = async (
  userId: string,
  deviceFingerprint: string
): Promise<UserDevice | null> => {
  try {
    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('device_fingerprint', deviceFingerprint)
      .single();

    if (error) {
      console.error('Error fetching current device:', error);
      return null;
    }

    return data as UserDevice;
  } catch (error) {
    console.error('Error in getCurrentDevice:', error);
    return null;
  }
};

/**
 * Check if a session is still active in the database
 */
export const isSessionActive = async (
  userId: string,
  sessionToken: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('is_active')
      .eq('user_id', userId)
      .eq('session_token', sessionToken)
      .single();

    if (error || !data) {
      return false;
    }

    return data.is_active;
  } catch (error) {
    console.error('Error checking session status:', error);
    return false;
  }
};
