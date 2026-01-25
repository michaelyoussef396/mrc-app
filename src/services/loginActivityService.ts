/**
 * Login Activity Service
 *
 * Handles logging of login attempts, device tracking,
 * and suspicious activity detection.
 */

import { supabase } from '@/integrations/supabase/client';
import { getDeviceInfo, getDeviceName, DeviceInfo } from '@/utils/deviceFingerprint';
import { getLocationInfo, formatLocation, LocationInfo } from '@/utils/ipLocation';

interface LogLoginParams {
  userId?: string;
  email: string;
  success: boolean;
  errorMessage?: string;
}

interface LoginActivityRecord {
  id: string;
  user_id: string | null;
  email: string;
  success: boolean;
  device_fingerprint: string | null;
  device_type: string | null;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  ip_address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  timezone: string | null;
  user_agent: string | null;
  error_message: string | null;
  created_at: string;
}

/**
 * Log a login attempt (successful or failed)
 * This is fire-and-forget - errors are logged but don't affect the caller
 */
export const logLoginActivity = async (params: LogLoginParams): Promise<void> => {
  try {
    // Fetch device and location info in parallel
    const [deviceInfo, locationInfo] = await Promise.all([
      getDeviceInfo().catch(() => null),
      getLocationInfo().catch(() => null),
    ]);

    const { error } = await supabase.from('login_activity').insert({
      user_id: params.userId || null,
      email: params.email,
      success: params.success,
      device_fingerprint: deviceInfo?.fingerprint || null,
      device_type: deviceInfo?.deviceType || null,
      browser: deviceInfo?.browser || null,
      browser_version: deviceInfo?.browserVersion || null,
      os: deviceInfo?.os || null,
      os_version: deviceInfo?.osVersion || null,
      ip_address: locationInfo?.ip || null,
      city: locationInfo?.city || null,
      region: locationInfo?.region || null,
      country: locationInfo?.country || null,
      timezone: deviceInfo?.timezone || null,
      user_agent: deviceInfo?.userAgent || null,
      error_message: params.errorMessage || null,
    });

    if (error) {
      console.error('Failed to log login activity:', error);
      return;
    }

    // If successful login, handle device tracking and suspicious activity checks
    if (params.success && params.userId && deviceInfo) {
      // Fire and forget - don't await these
      handleDeviceTracking(params.userId, deviceInfo, locationInfo).catch(console.error);
      checkForSuspiciousActivity(params.userId, locationInfo, deviceInfo).catch(console.error);
    }

    // If multiple failed attempts, log suspicious activity
    if (!params.success) {
      checkForMultipleFailures(params.email).catch(console.error);
    }

  } catch (error) {
    console.error('Error in logLoginActivity:', error);
  }
};

/**
 * Handle device tracking - create or update device record
 */
const handleDeviceTracking = async (
  userId: string,
  deviceInfo: DeviceInfo,
  locationInfo: LocationInfo | null
): Promise<string | null> => {
  try {
    // Check if device exists
    const { data: existingDevice, error: fetchError } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('device_fingerprint', deviceInfo.fingerprint)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching device:', fetchError);
      return null;
    }

    if (existingDevice) {
      // Update existing device
      await supabase
        .from('user_devices')
        .update({
          last_used_at: new Date().toISOString(),
          is_current: true,
        })
        .eq('id', existingDevice.id);

      // Set other devices as not current
      await supabase
        .from('user_devices')
        .update({ is_current: false })
        .eq('user_id', userId)
        .neq('id', existingDevice.id);

      return existingDevice.id;
    } else {
      // New device - insert and flag as suspicious
      const { data: newDevice, error: insertError } = await supabase
        .from('user_devices')
        .insert({
          user_id: userId,
          device_fingerprint: deviceInfo.fingerprint,
          device_name: getDeviceName(deviceInfo),
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          is_trusted: false,
          is_current: true,
          first_ip: locationInfo?.ip || null,
          first_location: locationInfo ? formatLocation(locationInfo) : null,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting device:', insertError);
        return null;
      }

      // Log suspicious activity for new device
      await supabase.from('suspicious_activity').insert({
        user_id: userId,
        activity_type: 'new_device',
        severity: 'medium',
        description: `New device detected: ${getDeviceName(deviceInfo)}`,
        details: {
          deviceInfo: {
            deviceType: deviceInfo.deviceType,
            browser: deviceInfo.browser,
            browserVersion: deviceInfo.browserVersion,
            os: deviceInfo.os,
            osVersion: deviceInfo.osVersion,
          },
          locationInfo: locationInfo ? {
            city: locationInfo.city,
            country: locationInfo.country,
            ip: locationInfo.ip,
          } : null,
        },
      });

      // Set other devices as not current
      if (newDevice) {
        await supabase
          .from('user_devices')
          .update({ is_current: false })
          .eq('user_id', userId)
          .neq('id', newDevice.id);
      }

      return newDevice?.id || null;
    }
  } catch (error) {
    console.error('Error in handleDeviceTracking:', error);
    return null;
  }
};

/**
 * Check for suspicious activity patterns
 */
export const checkForSuspiciousActivity = async (
  userId: string,
  currentLocation: LocationInfo | null,
  currentDevice: DeviceInfo | null
): Promise<void> => {
  try {
    // Get recent successful logins
    const { data: recentLogins, error } = await supabase
      .from('login_activity')
      .select('*')
      .eq('user_id', userId)
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !recentLogins || recentLogins.length < 2) {
      return;
    }

    const lastLogin = recentLogins[1] as LoginActivityRecord;

    // Check for impossible travel
    if (currentLocation && lastLogin.country) {
      const timeDiff = Date.now() - new Date(lastLogin.created_at).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // If different country within 2 hours, flag as impossible travel
      if (lastLogin.country !== currentLocation.country && hoursDiff < 2) {
        await supabase.from('suspicious_activity').insert({
          user_id: userId,
          activity_type: 'impossible_travel',
          severity: 'high',
          description: `Login from ${currentLocation.country} within ${Math.round(hoursDiff * 60)} minutes of login from ${lastLogin.country}`,
          details: {
            currentLocation: {
              city: currentLocation.city,
              country: currentLocation.country,
              ip: currentLocation.ip,
            },
            lastLogin: {
              city: lastLogin.city,
              country: lastLogin.country,
              ip: lastLogin.ip_address,
              timestamp: lastLogin.created_at,
            },
            timeDifferenceMinutes: Math.round(hoursDiff * 60),
          },
        });
      }
    }

    // Check for new location (different country from usual)
    const countries = recentLogins
      .filter((l): l is LoginActivityRecord => l.country != null)
      .map((l) => l.country);

    if (currentLocation && countries.length >= 3) {
      const countryFrequency: Record<string, number> = {};
      countries.forEach(c => {
        if (c) countryFrequency[c] = (countryFrequency[c] || 0) + 1;
      });

      // If current country has never been seen before
      if (!countryFrequency[currentLocation.country]) {
        await supabase.from('suspicious_activity').insert({
          user_id: userId,
          activity_type: 'new_location',
          severity: 'low',
          description: `First login from ${currentLocation.country}`,
          details: {
            newLocation: currentLocation.country,
            usualCountries: Object.keys(countryFrequency),
          },
        });
      }
    }
  } catch (error) {
    console.error('Error checking for suspicious activity:', error);
  }
};

/**
 * Check for multiple failed login attempts
 */
const checkForMultipleFailures = async (email: string): Promise<void> => {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: recentFailures, error } = await supabase
      .from('login_activity')
      .select('*')
      .eq('email', email)
      .eq('success', false)
      .gte('created_at', fifteenMinutesAgo);

    if (error) {
      console.error('Error checking failed attempts:', error);
      return;
    }

    // If 3+ failures in 15 minutes, flag as suspicious
    if (recentFailures && recentFailures.length >= 3) {
      // Check if we already flagged this recently
      const { data: existingFlag } = await supabase
        .from('suspicious_activity')
        .select('id')
        .eq('activity_type', 'multiple_failures')
        .gte('created_at', fifteenMinutesAgo)
        .maybeSingle();

      if (!existingFlag) {
        await supabase.from('suspicious_activity').insert({
          user_id: null, // May not have user_id for failed attempts
          activity_type: 'multiple_failures',
          severity: recentFailures.length >= 5 ? 'high' : 'medium',
          description: `${recentFailures.length} failed login attempts for ${email} in 15 minutes`,
          details: {
            email,
            attemptCount: recentFailures.length,
            ips: [...new Set(recentFailures.map(f => f.ip_address).filter(Boolean))],
          },
        });
      }
    }
  } catch (error) {
    console.error('Error in checkForMultipleFailures:', error);
  }
};

/**
 * Get login history for a user
 */
export const getLoginHistory = async (
  userId: string,
  limit: number = 20
): Promise<LoginActivityRecord[]> => {
  const { data, error } = await supabase
    .from('login_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching login history:', error);
    return [];
  }

  return data as LoginActivityRecord[];
};

/**
 * Get suspicious activity for a user (or all if admin)
 */
export const getSuspiciousActivity = async (
  userId?: string,
  unreviewed: boolean = false
): Promise<any[]> => {
  let query = supabase
    .from('suspicious_activity')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (unreviewed) {
    query = query.eq('reviewed', false);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    console.error('Error fetching suspicious activity:', error);
    return [];
  }

  return data || [];
};

/**
 * Mark suspicious activity as reviewed
 */
export const reviewSuspiciousActivity = async (
  activityId: string,
  reviewedBy: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('suspicious_activity')
    .update({
      reviewed: true,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', activityId);

  if (error) {
    console.error('Error reviewing suspicious activity:', error);
    return false;
  }

  return true;
};
