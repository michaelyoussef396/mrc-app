/**
 * IP Location Utility
 *
 * Gets location information from IP address
 * for login activity tracking and suspicious activity detection.
 * Uses multiple fallback APIs for reliability.
 */

export interface LocationInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  timezone: string;
  lat?: number;
  lon?: number;
}

// Multiple IP geolocation APIs as fallbacks
const IP_APIS = [
  {
    url: 'https://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,query',
    normalize: (data: any): LocationInfo | null => {
      if (data.status !== 'success') return null;
      return {
        ip: data.query || 'Unknown',
        city: data.city || 'Unknown',
        region: data.regionName || data.region || 'Unknown',
        country: data.country || 'Unknown',
        countryCode: data.countryCode || 'XX',
        timezone: data.timezone || 'Unknown',
        lat: data.lat,
        lon: data.lon,
      };
    },
  },
  {
    url: 'https://ipwho.is/',
    normalize: (data: any): LocationInfo | null => {
      if (!data.success) return null;
      return {
        ip: data.ip || 'Unknown',
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        country: data.country || 'Unknown',
        countryCode: data.country_code || 'XX',
        timezone: data.timezone?.id || 'Unknown',
        lat: data.latitude,
        lon: data.longitude,
      };
    },
  },
  {
    url: 'https://ipapi.co/json/',
    normalize: (data: any): LocationInfo | null => {
      if (data.error) return null;
      return {
        ip: data.ip || 'Unknown',
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        country: data.country_name || 'Unknown',
        countryCode: data.country_code || 'XX',
        timezone: data.timezone || 'Unknown',
        lat: data.latitude,
        lon: data.longitude,
      };
    },
  },
];

// Cache location to avoid excessive API calls
let cachedLocation: LocationInfo | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let locationPromise: Promise<LocationInfo | null> | null = null;

/**
 * Get location information from IP
 * Tries multiple APIs with fallback for reliability
 */
export const getLocationInfo = async (): Promise<LocationInfo | null> => {
  // Return cached location if fresh
  if (cachedLocation && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedLocation;
  }

  // Return pending promise if already fetching
  if (locationPromise) {
    return locationPromise;
  }

  locationPromise = (async () => {
    // Try each API in order until one succeeds
    for (const api of IP_APIS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(api.url, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`IP API ${api.url} returned ${response.status}`);
          continue;
        }

        const data = await response.json();
        const location = api.normalize(data);

        if (location) {
          cachedLocation = location;
          cacheTimestamp = Date.now();
          return location;
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn(`IP API ${api.url} timed out`);
        } else {
          console.warn(`IP API ${api.url} failed:`, error.message);
        }
        continue;
      }
    }

    console.error('❌ [IP Location] All APIs failed');
    locationPromise = null;
    return null;
  })();

  const result = await locationPromise;
  locationPromise = null;
  return result;
};

/**
 * Format location for display
 */
export const formatLocation = (info: LocationInfo | null): string => {
  if (!info) return 'Unknown';

  const parts = [info.city, info.region, info.country].filter(Boolean);
  return parts.join(', ') || 'Unknown';
};

/**
 * Check if travel between two locations is impossible in the given time
 * (e.g., login from Australia then USA within 2 hours)
 */
export const isImpossibleTravel = (
  location1: LocationInfo | null,
  location2: LocationInfo | null,
  timeDifferenceHours: number
): boolean => {
  if (!location1 || !location2) return false;

  // If same country, allow any time difference
  if (location1.countryCode === location2.countryCode) return false;

  // If different countries and less than 2 hours, flag as suspicious
  // (This is a simple heuristic - could be improved with actual distance calculation)
  if (timeDifferenceHours < 2) {
    return true;
  }

  // For different continents, require more time
  const continent1 = getContinent(location1.countryCode);
  const continent2 = getContinent(location2.countryCode);

  if (continent1 !== continent2 && timeDifferenceHours < 8) {
    return true;
  }

  return false;
};

/**
 * Get continent from country code (simplified)
 */
const getContinent = (countryCode: string): string => {
  const continentMap: Record<string, string> = {
    // Oceania
    AU: 'Oceania', NZ: 'Oceania', FJ: 'Oceania',
    // Asia
    JP: 'Asia', CN: 'Asia', KR: 'Asia', IN: 'Asia', SG: 'Asia', HK: 'Asia', TW: 'Asia', TH: 'Asia', VN: 'Asia', MY: 'Asia', ID: 'Asia', PH: 'Asia',
    // Europe
    GB: 'Europe', DE: 'Europe', FR: 'Europe', IT: 'Europe', ES: 'Europe', NL: 'Europe', BE: 'Europe', SE: 'Europe', NO: 'Europe', DK: 'Europe', FI: 'Europe', PL: 'Europe', AT: 'Europe', CH: 'Europe', IE: 'Europe', PT: 'Europe',
    // North America
    US: 'North America', CA: 'North America', MX: 'North America',
    // South America
    BR: 'South America', AR: 'South America', CL: 'South America', CO: 'South America', PE: 'South America',
    // Africa
    ZA: 'Africa', EG: 'Africa', NG: 'Africa', KE: 'Africa', MA: 'Africa',
  };

  return continentMap[countryCode] || 'Unknown';
};

/**
 * Clear cached location (useful for testing)
 */
export const clearLocationCache = (): void => {
  cachedLocation = null;
  locationPromise = null;
};
