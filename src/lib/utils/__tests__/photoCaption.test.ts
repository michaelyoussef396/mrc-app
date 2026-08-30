// Auto-derived caption guarantees.
//
// derivePhotoCaption() replaced PhotoCaptionPromptDialog for the five roles
// whose caption is display-only. These tests pin the four properties the rest
// of the system depends on: never empty (the upload and offline-dequeue gates
// reject empty), never a reserved sentinel (a collision would silently move a
// photo into the wrong PDF slot), never a percentage (the moisture-orphan
// detector pattern-matches captions), and never over the column width.

import { describe, it, expect } from 'vitest'
import {
  RESERVED_CAPTIONS,
  derivePhotoCaption,
  isReservedCaption,
  sanitizeCaptionContext,
  type DerivablePhotoRole,
} from '../photoCaption'

const ROLES: DerivablePhotoRole[] = [
  'roomView',
  'subfloor',
  'before',
  'after',
  'demolition',
]

const BLANK_AREA_NAMES = [undefined, null, '', '   ', '\t\n'] as const

/** Copied from check-photo-moisture-orphans/index.ts:42 — keep in sync. */
const MOISTURE_ORPHAN_PERCENT_ARM = /\d+(\.\d+)?%/

const ROLE_AND_RESERVED = ROLES.flatMap((role) =>
  RESERVED_CAPTIONS.map((reserved) => [role, reserved] as const)
)

describe('derivePhotoCaption', () => {
  it('composes the area name and the role label', () => {
    expect(derivePhotoCaption('roomView', { areaName: 'Bathroom' })).toBe(
      'Bathroom — Room Photo'
    )
  })

  it('returns the bare role label for subfloor, which has no area', () => {
    expect(derivePhotoCaption('subfloor')).toBe('Subfloor Photo')
  })

  it('returns the bare role label for before photos', () => {
    expect(derivePhotoCaption('before')).toBe('Before')
  })

  it('returns the bare role label for after photos', () => {
    expect(derivePhotoCaption('after')).toBe('After')
  })

  it('returns the bare role label for demolition photos', () => {
    expect(derivePhotoCaption('demolition')).toBe('Demolition')
  })

  it.each(ROLES)('returns a non-empty caption for role %s with an area name', (role) => {
    expect(derivePhotoCaption(role, { areaName: 'Bathroom' }).trim().length).toBeGreaterThan(0)
  })

  it.each(BLANK_AREA_NAMES)(
    'returns a non-empty caption when the area name is %j',
    (areaName) => {
      expect(derivePhotoCaption('roomView', { areaName }).trim().length).toBeGreaterThan(0)
    }
  )

  it('omits the separator when the area name is blank', () => {
    expect(derivePhotoCaption('roomView', { areaName: '   ' })).toBe('Room Photo')
  })

  it.each(ROLE_AND_RESERVED)(
    'never returns a reserved sentinel for role %s when the area is named %s',
    (role, reservedAreaName) => {
      expect(isReservedCaption(derivePhotoCaption(role, { areaName: reservedAreaName }))).toBe(
        false
      )
    }
  )

  it('keeps a reserved word as area context rather than dropping it', () => {
    expect(derivePhotoCaption('roomView', { areaName: 'Infrared' })).toBe(
      'Infrared — Room Photo'
    )
  })

  it.each(['50% humidity', '42.5% wall', '100%', 'Wall at 8.25% moisture'])(
    'strips the percentage from an area named %s so the orphan detector cannot match',
    (areaName) => {
      expect(MOISTURE_ORPHAN_PERCENT_ARM.test(derivePhotoCaption('roomView', { areaName }))).toBe(
        false
      )
    }
  )

  it('stays within the caption column width for a pathological area name', () => {
    const caption = derivePhotoCaption('roomView', { areaName: 'A'.repeat(1000) })
    expect(caption.length).toBeLessThanOrEqual(500)
  })

  it('collapses newlines and tabs in the area name', () => {
    expect(derivePhotoCaption('roomView', { areaName: 'Front\n\tDoor' })).toBe(
      'Front Door — Room Photo'
    )
  })
})

describe('sanitizeCaptionContext', () => {
  it.each(BLANK_AREA_NAMES)('returns an empty string for %j', (raw) => {
    expect(sanitizeCaptionContext(raw)).toBe('')
  })

  it('returns an empty string when only percent signs are supplied', () => {
    expect(sanitizeCaptionContext('%%%')).toBe('')
  })

  it('collapses runs of whitespace to a single space', () => {
    expect(sanitizeCaptionContext('Master    Bedroom')).toBe('Master Bedroom')
  })

  it('clamps a long area name to the context limit', () => {
    expect(sanitizeCaptionContext('A'.repeat(1000)).length).toBe(60)
  })

  it('normalises decomposed characters so equal names compare equal', () => {
    // 'Ensuite' + a combining acute must fold to the precomposed form.
    expect(sanitizeCaptionContext('Ensuite\u0301')).toBe('Ensuit\u00e9')
  })
})

describe('isReservedCaption', () => {
  it.each(RESERVED_CAPTIONS)('recognises %s as reserved', (reserved) => {
    expect(isReservedCaption(reserved)).toBe(true)
  })

  it('ignores case when matching a reserved sentinel', () => {
    expect(isReservedCaption('INFRARED')).toBe(true)
  })

  it('ignores surrounding whitespace when matching a reserved sentinel', () => {
    expect(isReservedCaption('  infrared  ')).toBe(true)
  })

  it('does not treat a derived caption as reserved', () => {
    expect(isReservedCaption('Bathroom — Room Photo')).toBe(false)
  })
})
