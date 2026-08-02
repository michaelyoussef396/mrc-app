// Display-only text formatting for customer-entered values.
// Never applied to stored data — presentation at render time only.

const AU_STATE_ABBREVIATIONS = new Set(['VIC', 'NSW', 'QLD', 'SA', 'WA', 'NT', 'ACT', 'TAS']);

/**
 * Title-case a customer-entered name or address for display.
 *
 * Leaves alone tokens whose casing carries meaning: anything with digits
 * (street numbers, postcodes), all-caps state abbreviations (VIC, NSW),
 * and mixed-case tokens (McDonald, DeSilva). Fully-lowercase or
 * fully-uppercase words are transformed, with letters after apostrophes
 * (straight or curly) and hyphens capitalised (o'brien → O'Brien,
 * jean-luc → Jean-Luc).
 */
export function toDisplayTitleCase(value: string): string {
  if (!value) return value;
  return value
    .split(/(\s+)/)
    .map((token) => {
      if (!/[a-zA-Z]/.test(token) || /\d/.test(token)) return token;
      const isAllCaps = token === token.toUpperCase();
      const isAllLower = token === token.toLowerCase();
      if (isAllCaps && AU_STATE_ABBREVIATIONS.has(token.replace(/[^a-zA-Z]/g, ''))) return token;
      if (!isAllCaps && !isAllLower) return token;
      return token
        .toLowerCase()
        .replace(/(^|['’-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
    })
    .join('');
}
