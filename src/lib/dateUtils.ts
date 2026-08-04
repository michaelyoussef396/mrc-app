const MELBOURNE_TZ = 'Australia/Melbourne';

export function formatDateAU(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input.length === 10 ? input + 'T00:00:00' : input) : input;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: MELBOURNE_TZ,
  });
}

export function formatTimeAU(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: MELBOURNE_TZ,
  }).replace(/\b[ap]m\b/gi, (m) => m.toUpperCase());
}

export function formatDateTimeAU(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '';
  const date = formatDateAU(d);
  const time = formatTimeAU(d);
  return `${date} at ${time}`;
}

export function formatWeekdayDateAU(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input.length === 10 ? input + 'T00:00:00' : input) : input;
  if (isNaN(d.getTime())) return '';
  const weekday = d.toLocaleDateString('en-AU', { weekday: 'long', timeZone: MELBOURNE_TZ });
  return `${weekday}, ${formatDateAU(d)}`;
}

export function formatShortDateAU(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input.length === 10 ? input + 'T00:00:00' : input) : input;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    timeZone: MELBOURNE_TZ,
  });
}

export function formatMediumDateAU(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input.length === 10 ? input + 'T00:00:00' : input) : input;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: MELBOURNE_TZ,
  });
}

export function formatRelativeOrDateAU(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateAU(d);
}

/**
 * Parse a Postgres DATE column ("YYYY-MM-DD") as LOCAL midnight.
 *
 * `new Date('2026-07-29')` parses as UTC midnight, which lands on the previous
 * calendar day for any timezone behind UTC and shifts day-boundary comparisons
 * (today / this week / this month) by one. Callers comparing a DATE against a
 * locally-constructed boundary must use this.
 */
export function parseLocalDate(input: string | null | undefined): Date | null {
  if (!input) return null;
  const d = new Date(input.length === 10 ? `${input}T00:00:00` : input);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Render a duration given in fractional hours.
 *
 * Sub-hour durations are the common case for response times, so they render in
 * minutes. Callers must pass unrounded hours — rounding to whole hours before
 * calling collapses every sub-30-minute duration to zero.
 */
export function formatDurationHours(hours: number): string {
  if (!isFinite(hours) || hours <= 0) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 10) return `${hours.toFixed(1)} hrs`;
  return `${Math.round(hours)} hrs`;
}

/**
 * Stable "YYYY-MM-DD" key built from LOCAL date parts.
 *
 * Chart bucketing must key both the data points and the axis buckets the same
 * way. `toISOString()` converts to UTC first, so in UTC+10 a local-midnight
 * bucket keys to the previous day — points then plot a day late and any row
 * past 10:00 local falls outside the generated range entirely.
 */
export function toLocalDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
