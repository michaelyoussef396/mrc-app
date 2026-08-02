// Display-only text formatting for customer-entered values.
// Never applied to stored data — presentation at render time only.

const STATE_ABBREVIATION_MAX_LETTERS = 3;

/**
 * Title-case a customer-entered name or address for display.
 *
 * Leaves alone tokens whose casing carries meaning: anything with digits
 * (street numbers, postcodes), short all-caps tokens (VIC, NSW), and
 * mixed-case tokens (McDonald, DeSilva). Only fully-lowercase or
 * fully-uppercase words are transformed, with letters after apostrophes
 * and hyphens capitalised (o'brien → O'Brien, jean-luc → Jean-Luc).
 */
export function toDisplayTitleCase(value: string): string {
  if (!value) return value;
  return value
    .split(/(\s+)/)
    .map((token) => {
      if (!/[a-zA-Z]/.test(token) || /\d/.test(token)) return token;
      const letterCount = (token.match(/[a-zA-Z]/g) || []).length;
      const isAllCaps = token === token.toUpperCase();
      const isAllLower = token === token.toLowerCase();
      if (isAllCaps && letterCount <= STATE_ABBREVIATION_MAX_LETTERS) return token;
      if (!isAllCaps && !isAllLower) return token;
      return token
        .toLowerCase()
        .replace(/(^|['-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
    })
    .join('');
}
