/**
 * Street-line assembly for Google Places results.
 *
 * Units are written in Australian slash notation — "4/12 Smith Street" — because that
 * is what staff already type by hand into `leads.property_address_street`. Keeping the
 * unit inside that one column means every existing address consumer renders it with no
 * change of its own.
 *
 * Every capture surface calls `buildStreetLine`. Three sites previously inlined the same
 * ternary and had already diverged on which string they fell back to, so the assembly
 * lives here rather than at the call sites.
 */

/** The subset of a Places lookup this module reads. Structural — a PlaceDetails passes. */
export interface PlaceAddressParts {
  formatted_address?: string
  street_number?: string
  street_name?: string
  unit?: string
}

/** Words Google or a human may write before a unit number. */
const UNIT_WORD = String.raw`(?:unit|apartment|apt|suite|shop|u)`

/** A leading "Unit " / "U. " on a subpremise value or a street line. */
const UNIT_PREFIX = new RegExp(String.raw`^\s*${UNIT_WORD}\s*\.?\s*`, 'i')

/** A segment carrying ONLY a unit, no street: "Unit 4", "U 3", "Apt 12B". */
const UNIT_ONLY_SEGMENT = new RegExp(String.raw`^\s*${UNIT_WORD}\s*\.?\s*\d+[a-z]?\s*$`, 'i')

/** Slash notation already present: "4/12 Smith St". */
const SLASH_UNIT = /^\s*\d+[a-z]?\s*\//i

/** Written notation already present: "Unit 4 12 Smith St". */
const WORDED_UNIT = new RegExp(String.raw`^\s*${UNIT_WORD}\s*\.?\s*\d`, 'i')

/**
 * "Unit 4" → "4". Google usually returns a bare subpremise, but not always.
 *
 * The strip is kept only when it leaves a number behind: "U" is a unit word, so a
 * naive replace would turn a subpremise of "Upper" into "pper".
 */
function normaliseUnit(unit: string): string {
  const trimmed = unit.trim()
  const stripped = trimmed.replace(UNIT_PREFIX, '').trim()
  return /^\d/.test(stripped) ? stripped : trimmed
}

/** Does this street line already carry its unit, in either notation? */
function hasLeadingUnit(streetLine: string): boolean {
  return SLASH_UNIT.test(streetLine) || WORDED_UNIT.test(streetLine)
}

/**
 * The street line from a formatted address, with `unit` folded in when the text does
 * not already carry it.
 *
 * Exported for the paths that have no structured components at all — a Places details
 * lookup that returned null, where only the prediction text survives.
 */
export function fallbackStreetLine(formattedAddress: string | undefined, unit = ''): string {
  const segments = (formattedAddress ?? '')
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length === 0) return ''

  const [first, second] = segments

  // Google splits some subpremise addresses onto their own segment — "Unit 4, 12 Smith
  // St, Richmond VIC 3121". Taking segment [0] alone yields "Unit 4": a unit with no
  // street number, which is the opposite corruption to dropping the unit entirely.
  if (UNIT_ONLY_SEGMENT.test(first) && second) {
    return `${normaliseUnit(first)}/${second}`
  }

  if (!unit || hasLeadingUnit(first)) return first
  return `${unit}/${first}`
}

/**
 * The street line to store, e.g. "4/12 Smith Street" or "12 Smith Street".
 *
 * Returns '' only when Places gave us nothing usable; callers with a prediction string
 * of their own should fall back to it.
 */
export function buildStreetLine(details: PlaceAddressParts): string {
  const unit = details.unit ? normaliseUnit(details.unit) : ''

  if (details.street_number && details.street_name) {
    const street = `${details.street_number} ${details.street_name}`
    return unit ? `${unit}/${street}` : street
  }

  return fallbackStreetLine(details.formatted_address, unit)
}
