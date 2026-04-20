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
  });
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
