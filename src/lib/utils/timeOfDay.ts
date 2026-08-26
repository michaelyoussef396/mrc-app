/**
 * 24-hour `"HH:mm"` ↔ 12-hour (hour / minute / AM-PM) conversion, plus the
 * option lists a three-column time picker needs. Pure — no DOM, no network.
 *
 * `"HH:mm"` is the wire format every booking consumer already expects:
 * `leads.scheduled_time`, `leads.customer_preferred_time`, and the
 * `calculate-travel-time` Edge Function's `requested_time` / `preferred_time`.
 */

export type Period = 'AM' | 'PM';

export interface TimeOfDay {
  /** 1–12, as shown on a clock face. */
  hour12: number;
  /** 0–59. */
  minute: number;
  period: Period;
}

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
export const DEFAULT_INTERVAL_MINUTES = 1;

/** Chronological order within a period — 12 o'clock precedes 1 o'clock. */
const CLOCK_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

/** Hours stay loose (`\d{1,2}`, range-checked below); minutes must be 00–59. */
const TIME_PATTERN = /^(\d{1,2}):([0-5]\d)$/;

/** Minutes since midnight for a `"HH:mm"` string, or null when malformed. */
export function toMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  if (hours > 23) return null;

  return hours * MINUTES_PER_HOUR + Number(match[2]);
}

/** Minutes since midnight back to a zero-padded `"HH:mm"`. */
export function fromMinutes(total: number): string {
  const wrapped = normalizeMinutes(total);
  const hours = Math.floor(wrapped / MINUTES_PER_HOUR);
  const minutes = wrapped % MINUTES_PER_HOUR;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function timeOfDayFromMinutes(total: number): TimeOfDay {
  const wrapped = normalizeMinutes(total);
  const hours24 = Math.floor(wrapped / MINUTES_PER_HOUR);
  return {
    hour12: hours24 % 12 || 12,
    minute: wrapped % MINUTES_PER_HOUR,
    period: hours24 >= 12 ? 'PM' : 'AM',
  };
}

export function timeOfDayToMinutes(time: TimeOfDay): number {
  const hours24 = (time.hour12 % 12) + (time.period === 'PM' ? 12 : 0);
  return normalizeMinutes(hours24 * MINUTES_PER_HOUR + time.minute);
}

/** `"09:07"` → `{ hour12: 9, minute: 7, period: 'AM' }`. Null when malformed. */
export function parseTimeOfDay(value: string): TimeOfDay | null {
  const total = toMinutes(value);
  return total === null ? null : timeOfDayFromMinutes(total);
}

/** `{ hour12: 2, minute: 5, period: 'PM' }` → `"14:05"`. */
export function formatTimeOfDay(time: TimeOfDay): string {
  return fromMinutes(timeOfDayToMinutes(time));
}

/**
 * `"14:05"` → `"2:05 PM"`.
 *
 * Returns the input untouched when it is not a valid 24-hour time. The public
 * request form writes band labels like `"Morning (8am–12pm)"` into the same
 * `customer_preferred_time` column, and those must degrade to plain text rather
 * than throwing on `undefined.toString()`.
 */
export function formatTimeLabel(value: string | null | undefined): string {
  if (!value) return '';

  const time = parseTimeOfDay(value);
  if (!time) return value;

  return `${time.hour12}:${String(time.minute).padStart(2, '0')} ${time.period}`;
}

/** Bound `total` to `[minTotal, maxTotal]` and snap it onto the interval grid. */
export function clampToRange(
  total: number,
  minTotal: number,
  maxTotal: number,
  intervalMinutes: number = DEFAULT_INTERVAL_MINUTES,
): number {
  const step = normalizeInterval(intervalMinutes);
  const bounded = Math.min(maxTotal, Math.max(minTotal, total));
  const snapped = Math.round(bounded / step) * step;

  if (snapped < minTotal) return minTotal;
  if (snapped > maxTotal) return maxTotal;
  return snapped;
}

/** Minutes selectable for a given clock hour, stepped by `intervalMinutes`. */
export function buildMinuteOptions(
  hour12: number,
  period: Period,
  minTotal: number,
  maxTotal: number,
  intervalMinutes: number = DEFAULT_INTERVAL_MINUTES,
): number[] {
  const step = normalizeInterval(intervalMinutes);
  const hourStart = timeOfDayToMinutes({ hour12, minute: 0, period });
  const minutes: number[] = [];

  for (let minute = 0; minute < MINUTES_PER_HOUR; minute += step) {
    const total = hourStart + minute;
    if (total >= minTotal && total <= maxTotal) minutes.push(minute);
  }

  return minutes;
}

/** Clock hours holding at least one selectable minute, in chronological order. */
export function buildHourOptions(
  period: Period,
  minTotal: number,
  maxTotal: number,
  intervalMinutes: number = DEFAULT_INTERVAL_MINUTES,
): number[] {
  return CLOCK_HOURS.filter(
    (hour12) => buildMinuteOptions(hour12, period, minTotal, maxTotal, intervalMinutes).length > 0,
  );
}

/** Periods holding at least one selectable time. */
export function buildPeriodOptions(
  minTotal: number,
  maxTotal: number,
  intervalMinutes: number = DEFAULT_INTERVAL_MINUTES,
): Period[] {
  return (['AM', 'PM'] as const).filter(
    (period) => buildHourOptions(period, minTotal, maxTotal, intervalMinutes).length > 0,
  );
}

function normalizeMinutes(total: number): number {
  const rounded = Math.round(total);
  return ((rounded % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function normalizeInterval(intervalMinutes: number): number {
  const step = Math.floor(intervalMinutes);
  if (!Number.isFinite(step) || step < 1) return DEFAULT_INTERVAL_MINUTES;
  return Math.min(step, MINUTES_PER_HOUR);
}
