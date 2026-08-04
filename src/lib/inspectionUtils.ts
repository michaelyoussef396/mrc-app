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

export type EnvironmentReadingKind =
  | 'indoorTemperature'
  | 'outdoorTemperature'
  | 'indoorHumidity'
  | 'outdoorHumidity'
  | 'moisture';

// Plausible-entry bounds, inclusive. Deliberately wide: these exist to catch a
// typo (one number entered into two fields), not to define correct readings.
export const ENVIRONMENT_READING_RANGES: Record<
  EnvironmentReadingKind,
  { min: number; max: number; unit: string; subject: string }
> = {
  indoorTemperature: { min: 0, max: 40, unit: '°C', subject: 'an indoor reading' },
  // Melbourne heatwaves legitimately reach 46°C outdoors, so the ceiling sits above it.
  outdoorTemperature: { min: -5, max: 48, unit: '°C', subject: 'an outdoor reading' },
  indoorHumidity: { min: 10, max: 100, unit: '%', subject: 'indoor humidity' },
  // Hot north-wind days genuinely drop outdoor humidity into single digits.
  outdoorHumidity: { min: 5, max: 100, unit: '%', subject: 'outdoor humidity' },
  // Wood-moisture-equivalent readings above 40% are normal on a wet job — never warn on those.
  moisture: { min: 0, max: 100, unit: '%', subject: 'a moisture reading' },
};

/**
 * Warn — never block — when an environmental reading falls outside its plausible
 * range. A genuine outlier must still be recordable, so this returns advisory text
 * only; nothing here gates save or submit.
 *
 * Takes the raw form-state string (all these inputs store strings) and returns null
 * for anything not yet a finite number, so no warning flashes mid-typing.
 *
 * NOTE: calculateDewPoint above already returns 0 for temperatures outside -40/+60,
 * so a wildly high temperature will also blank the dew point on the form.
 */
export const getEnvironmentReadingWarning = (
  kind: EnvironmentReadingKind,
  rawValue: string,
): string | null => {
  const trimmed = (rawValue ?? '').trim();
  if (trimmed === '') return null;

  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;

  const { min, max, unit, subject } = ENVIRONMENT_READING_RANGES[kind];
  if (value >= min && value <= max) return null;

  // A below-floor value may just be the first digit of an in-range one: typing 55 into
  // a 10–100 humidity field passes through 5. Warning there fires a live-region alert
  // and shifts the layout on every normal entry, so hold off while another digit could
  // still bring the value into range. Above-ceiling values can't be prefixes, so the
  // typo this exists to catch — one number typed into two fields — still warns at once.
  //
  // The trade-off: for the two humidity kinds every value below the floor is also a
  // possible prefix, so their low bound never fires. Distinguishing a finished entry
  // from a partial one needs blur state the three moisture inputs don't currently have.
  const couldGainAnotherDigit = value >= 0 && value * 10 <= max;
  if (value < min && couldGainAnotherDigit) return null;

  const direction = value > max ? 'high' : 'low';
  return `Unusually ${direction} for ${subject} — expected ${min}–${max}${unit}. Check before saving.`;
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
