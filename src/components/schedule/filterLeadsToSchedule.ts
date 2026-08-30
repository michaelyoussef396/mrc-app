import type { LeadToSchedule } from '@/hooks/useLeadsToSchedule';

const NON_DIGITS = /\D+/g;
const CONTAINS_LETTER = /[a-z]/;
// Below this, a numeric token is a unit or street number rather than part of a phone.
const MIN_PHONE_DIGITS = 3;
// Australian numbers are stored either as 04.. / (03).. or in +61 form; compare in local form.
const INTERNATIONAL_PREFIX = /^61(?=\d{9}$)/;

/**
 * Client-side search over the already-loaded To Schedule list.
 *
 * A lead matches when either the whole term reads as its phone number, or every
 * whitespace-separated token is found on the lead — name, suburb, or the full
 * property address (street and postcode live there). So "campbell 3121" narrows to
 * Campbells in postcode 3121, while "03 9380 1122" is treated as one number rather
 * than three fragments. Case-insensitive; an empty term returns the list untouched.
 */
export function filterLeadsToSchedule(leads: LeadToSchedule[], term: string): LeadToSchedule[] {
  const trimmed = term.trim().toLowerCase();
  if (trimmed === '') return leads;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const wholeTermDigits = toPhoneDigits(trimmed);

  return leads.filter((lead) => {
    if (wholeTermDigits && toLocalDigits(lead.phone).includes(wholeTermDigits)) return true;
    return tokens.every((token) => matchesToken(lead, token));
  });
}

function matchesToken(lead: LeadToSchedule, token: string): boolean {
  const text = [lead.fullName, lead.suburb, lead.propertyAddress].join(' ').toLowerCase();
  if (text.includes(token)) return true;

  const tokenDigits = toPhoneDigits(token);
  return tokenDigits !== null && toLocalDigits(lead.phone).includes(tokenDigits);
}

/** Digits of a phone-shaped string, or null when it is too short or not a number at all. */
function toPhoneDigits(value: string): string | null {
  // "2b" is a unit number; without this it would reduce to "2" and match nearly every number.
  if (CONTAINS_LETTER.test(value)) return null;

  const digits = toLocalDigits(value);
  return digits.length >= MIN_PHONE_DIGITS ? digits : null;
}

function toLocalDigits(value: string): string {
  return value.replace(NON_DIGITS, '').replace(INTERNATIONAL_PREFIX, '0');
}
