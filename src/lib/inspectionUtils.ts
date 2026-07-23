// Utility functions for inspection form

/**
 * Calculate dew point from temperature and humidity using the Magnus-Tetens formula
 * with Alduchov-Eskridge 1996 coefficients.
 *
 * Accurate to ±0.4°C across 0-50°C / 1-100% RH (vs. ±2°C for the simple
 * T-(100-RH)/5 approximation, which degrades at low RH — see BUG-041).
 * Returns 0 on invalid input to preserve the existing callsite contract
 * (callers do `.toString()` on the return value). Out-of-range temperatures
 * emit a console.warn so observability isn't lost.
 */
// Magnus-Tetens with Alduchov-Eskridge 1996 coefficients.
// Accurate to ±0.4°C across 0-50°C / 1-100% RH (vs. ±2°C for the simple
// T-(100-RH)/5 approximation, which degrades at low RH — see BUG-041).
// Returns 0 on invalid input to preserve the existing callsite contract
// (callers do `.toString()` on the return value). Out-of-range temperatures
// emit a console.warn so observability isn't lost.
export const calculateDewPoint = (temperature: number, humidity: number): number => {
  if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) return 0;
  if (humidity <= 0) return 0;

  // Clamp RH > 100 to 100 (saturated air)
  const rh = Math.min(humidity, 100);

  // Magnus-Tetens valid range: roughly -40°C to +60°C.
  if (temperature < -40 || temperature > 60) {
    console.warn(
      `[calculateDewPoint] Temperature ${temperature}°C outside Magnus-Tetens valid range (-40 to +60). Returning 0.`,
    );
    return 0;
  }

  const A = 17.625;
  const B = 243.04;
  const gamma = Math.log(rh / 100) + (A * temperature) / (B + temperature);
  const dewPoint = (B * gamma) / (A - gamma);

  if (!Number.isFinite(dewPoint)) return 0;
  return Math.round(dewPoint * 10) / 10;
};

/**
 * Generate unique job number
 * Format: MRC-YYYY-XXXX
 */
export const generateJobNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9999) + 1;
  return `MRC-${year}-${String(random).padStart(4, '0')}`;
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
