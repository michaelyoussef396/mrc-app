import { describe, it, expect } from 'vitest'
import {
  australianStateSchema,
  isValidAustralianState,
  isValidVictorianPostcode,
  victorianPostcodeSchema,
} from '../lead-creation.schemas'

describe('australianStateSchema', () => {
  it.each(['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'])(
    'accepts canonical state code %s',
    (code) => {
      expect(australianStateSchema.safeParse(code).success).toBe(true)
    },
  )

  it('rejects unknown state code', () => {
    expect(australianStateSchema.safeParse('XX').success).toBe(false)
  })

  it('rejects lowercase state code', () => {
    expect(australianStateSchema.safeParse('vic').success).toBe(false)
  })

  it('rejects empty string', () => {
    expect(australianStateSchema.safeParse('').success).toBe(false)
  })
})

describe('isValidAustralianState', () => {
  it('returns true for canonical code', () => {
    expect(isValidAustralianState('VIC')).toBe(true)
  })

  it('returns false for unknown code', () => {
    expect(isValidAustralianState('XX')).toBe(false)
  })

  it('narrows the type when true', () => {
    const value: string = 'NSW'
    if (isValidAustralianState(value)) {
      const narrowed: 'VIC' | 'NSW' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT' = value
      expect(narrowed).toBe('NSW')
    }
  })
})

describe('victorianPostcodeSchema', () => {
  it('accepts 3000 (Melbourne CBD)', () => {
    expect(victorianPostcodeSchema.safeParse('3000').success).toBe(true)
  })

  it('accepts 3999 (top of Victorian range)', () => {
    expect(victorianPostcodeSchema.safeParse('3999').success).toBe(true)
  })

  it('rejects 2000 (NSW postcode)', () => {
    expect(victorianPostcodeSchema.safeParse('2000').success).toBe(false)
  })

  it('rejects 5-digit postcode', () => {
    expect(victorianPostcodeSchema.safeParse('30000').success).toBe(false)
  })

  it('rejects 3-digit postcode', () => {
    expect(victorianPostcodeSchema.safeParse('300').success).toBe(false)
  })

  it('rejects empty string', () => {
    expect(victorianPostcodeSchema.safeParse('').success).toBe(false)
  })

  it('rejects non-numeric characters', () => {
    expect(victorianPostcodeSchema.safeParse('3ABC').success).toBe(false)
  })
})

describe('isValidVictorianPostcode', () => {
  it('returns true for valid Melbourne postcode', () => {
    expect(isValidVictorianPostcode('3000')).toBe(true)
  })

  it('returns false for NSW postcode', () => {
    expect(isValidVictorianPostcode('2000')).toBe(false)
  })
})
