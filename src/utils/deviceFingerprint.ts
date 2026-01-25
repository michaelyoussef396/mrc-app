/**
 * Device Fingerprint Utility
 *
 * Generates a unique device fingerprint for tracking
 * login sessions and detecting suspicious activity.
 */

import FingerprintJS from '@fingerprintjs/fingerprintjs';

export interface DeviceInfo {
  fingerprint: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  screenResolution: string;
  timezone: string;
  language: string;
  userAgent: string;
}

// Cache the fingerprint to avoid recalculating
let cachedFingerprint: string | null = null;
let fingerprintPromise: Promise<string> | null = null;

/**
 * Get the device fingerprint
 */
export const getFingerprint = async (): Promise<string> => {
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  if (fingerprintPromise) {
    return fingerprintPromise;
  }

  fingerprintPromise = (async () => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      cachedFingerprint = result.visitorId;
      return cachedFingerprint;
    } catch (error) {
      console.error('Error getting fingerprint:', error);
      // Fallback to a simple hash if FingerprintJS fails
      const fallback = generateFallbackFingerprint();
      cachedFingerprint = fallback;
      return fallback;
    }
  })();

  return fingerprintPromise;
};

/**
 * Generate a fallback fingerprint if FingerprintJS fails
 */
const generateFallbackFingerprint = (): string => {
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
  ].join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

/**
 * Detect device type based on user agent
 */
export const getDeviceType = (): 'desktop' | 'mobile' | 'tablet' => {
  const ua = navigator.userAgent.toLowerCase();

  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }

  if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
};

/**
 * Parse browser information from user agent
 */
const getBrowserInfo = (): { browser: string; browserVersion: string } => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let browserVersion = '';

  if (ua.includes('Firefox/')) {
    browser = 'Firefox';
    browserVersion = ua.split('Firefox/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
    browserVersion = ua.split('Edg/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome';
    browserVersion = ua.split('Chrome/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browser = 'Safari';
    browserVersion = ua.split('Version/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('MSIE') || ua.includes('Trident/')) {
    browser = 'Internet Explorer';
    browserVersion = ua.split('MSIE ')[1]?.split(';')[0] || '11';
  }

  return { browser, browserVersion };
};

/**
 * Parse OS information from user agent
 */
const getOSInfo = (): { os: string; osVersion: string } => {
  const ua = navigator.userAgent;
  let os = 'Unknown';
  let osVersion = '';

  if (ua.includes('Windows NT')) {
    os = 'Windows';
    const versionMap: Record<string, string> = {
      '10.0': '10/11',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
      '6.0': 'Vista',
      '5.1': 'XP',
    };
    const match = ua.match(/Windows NT (\d+\.\d+)/);
    if (match) {
      osVersion = versionMap[match[1]] || match[1];
    }
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS';
    const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    if (match) {
      osVersion = match[1].replace(/_/g, '.');
    }
  } else if (ua.includes('Android')) {
    os = 'Android';
    const match = ua.match(/Android (\d+\.?\d*)/);
    if (match) {
      osVersion = match[1];
    }
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
    const match = ua.match(/OS (\d+_\d+)/);
    if (match) {
      osVersion = match[1].replace(/_/g, '.');
    }
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  }

  return { os, osVersion };
};

/**
 * Get comprehensive device information
 */
export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  const fingerprint = await getFingerprint();
  const { browser, browserVersion } = getBrowserInfo();
  const { os, osVersion } = getOSInfo();

  return {
    fingerprint,
    deviceType: getDeviceType(),
    browser,
    browserVersion,
    os,
    osVersion,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    userAgent: navigator.userAgent,
  };
};

/**
 * Get a human-readable device name
 */
export const getDeviceName = (info: DeviceInfo): string => {
  return `${info.browser} on ${info.os}`;
};
