// Derived captions for the photo roles that no longer prompt the technician.
//
// `photos.caption` does double duty in this codebase. For eight roles it is the
// slot-identity discriminator — `photo_type` is too coarse to tell the five
// outdoor slots apart, so the slot is carried in the caption as a sentinel and
// read back by exact comparison (generate-inspection-pdf/index.ts:1415,
// 1452-1453, 1688-1695; TechnicianInspectionForm.tsx:3148-3159, 3220-3224;
// InspectionDataDisplay.tsx:501-517). Those sentinels are never produced here.
//
// For the five roles below the caption is display-only — matched by exclusion
// or rendered to a human — which is why they are safe to derive.

export const RESERVED_CAPTIONS = [
  'infrared',
  'natural_infrared',
  'moisture',
  'front_door',
  'front_house',
  'mailbox',
  'street',
  'direction',
] as const

/** photos.caption is VARCHAR(500) — migration 20251028135212_...sql:601 */
const MAX_CAPTION_LENGTH = 500

/** Keeps a pathological area name from crowding out the role label. */
const MAX_CONTEXT_LENGTH = 60

const CONTEXT_SEPARATOR = ' — '

export type DerivablePhotoRole =
  | 'roomView'
  | 'subfloor'
  | 'before'
  | 'after'
  | 'demolition'

// Every label is non-empty, non-reserved and digit-free, which is what makes
// the fallback paths in derivePhotoCaption() statically safe.
const ROLE_LABELS: Record<DerivablePhotoRole, string> = {
  roomView: 'Room Photo',
  subfloor: 'Subfloor Photo',
  before: 'Before',
  after: 'After',
  demolition: 'Demolition',
}

export function isReservedCaption(value: string): boolean {
  return (RESERVED_CAPTIONS as readonly string[]).includes(value.trim().toLowerCase())
}

/**
 * Area names are free text typed by a technician. Strip anything that could
 * collide with a machine reader or corrupt display, then clamp the length.
 *
 * `%` is removed because check-photo-moisture-orphans/index.ts:42 matches
 * `/^moisture$|\d+(\.\d+)?%/i` — its percent arm is unanchored, so an area
 * named "50% humidity" would make every photo in it look like an orphaned
 * moisture reading.
 *
 * Returns '' when nothing usable survives.
 */
export function sanitizeCaptionContext(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return ''

  const cleaned = raw
    .normalize('NFC')
    .replace(/%/g, '')
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned.length > MAX_CONTEXT_LENGTH
    ? cleaned.slice(0, MAX_CONTEXT_LENGTH).trim()
    : cleaned
}

/**
 * The single source of truth for auto-derived captions. Never derive one
 * anywhere else — the reserved-word guard here is what stops a photo from
 * silently hijacking a sentinel slot in the customer PDF.
 *
 * Guarantees, each pinned by a test in __tests__/photoCaption.test.ts:
 *   1. the result is never empty, so it passes validatePhotoCaption()
 *      (photoUpload.ts:41) and isCaptionValid() (SyncManager.ts:21)
 *   2. the result is never a reserved sentinel
 *   3. the result never contains a percentage
 *   4. the result is never longer than MAX_CAPTION_LENGTH
 */
export function derivePhotoCaption(
  role: DerivablePhotoRole,
  context?: { areaName?: string | null }
): string {
  const roleLabel = ROLE_LABELS[role]
  const areaName = sanitizeCaptionContext(context?.areaName)

  const caption = areaName ? `${areaName}${CONTEXT_SEPARATOR}${roleLabel}` : roleLabel

  // Unreachable while every caption carries a role-label suffix, but the column
  // has no DB-level protection and area names are free text, so the guard earns
  // its place. The fallback is a ROLE_LABELS value, which is never reserved.
  if (isReservedCaption(caption)) return roleLabel

  // Also unreachable: MAX_CONTEXT_LENGTH + separator + longest label is 78.
  if (caption.length > MAX_CAPTION_LENGTH) return roleLabel

  return caption
}
