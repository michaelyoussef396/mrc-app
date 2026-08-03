import { describe, it, expect, vi } from 'vitest'
import { calculateDewPoint, formatCurrency, getEnvironmentReadingWarning } from '../inspectionUtils'

// Formula: Magnus-Tetens with Alduchov-Eskridge 1996 coefficients (A=17.625, B=243.04).
// Replaces the prior simple approximation Td ≈ T − (100−RH)/5 (BUG-041).
describe('calculateDewPoint', () => {
  it('should return ~16.7 for 25°C and 60% RH', () => {
    expect(calculateDewPoint(25, 60)).toBe(16.7)
  })

  it('should return ~13.5 for 23°C and 55% RH', () => {
    expect(calculateDewPoint(23, 55)).toBe(13.5)
  })

  it('should return ~8.3 for 32°C and 23% RH (section9 known-value)', () => {
    expect(calculateDewPoint(32, 23)).toBe(8.3)
  })

  it('should return ~3.7 for 20°C and 34% RH (section9 known-value)', () => {
    expect(calculateDewPoint(20, 34)).toBe(3.7)
  })

  it('should return ~19.3 for 47°C and 21% RH (section9 known-value)', () => {
    expect(calculateDewPoint(47, 21)).toBe(19.3)
  })

  it('should accept 0°C as valid input (Number.isFinite, not falsy)', () => {
    // Old code returned 0 here due to !temperature falsy guard. Magnus-Tetens
    // correctly computes -6.8°C for 0°C / 60% RH.
    expect(calculateDewPoint(0, 60)).toBe(-6.8)
  })

  it('should return 0 when humidity is 0 (invalid input)', () => {
    expect(calculateDewPoint(25, 0)).toBe(0)
  })

  it('should return 0 when humidity is negative (invalid input)', () => {
    expect(calculateDewPoint(25, -10)).toBe(0)
  })

  it('should clamp humidity above 100 to 100 (saturated air)', () => {
    expect(calculateDewPoint(25, 150)).toBe(calculateDewPoint(25, 100))
  })

  it('should return 0 when temperature is NaN', () => {
    expect(calculateDewPoint(NaN, 50)).toBe(0)
  })

  it('should return 0 when humidity is NaN', () => {
    expect(calculateDewPoint(25, NaN)).toBe(0)
  })

  it('should return 0 when temperature is Infinity', () => {
    expect(calculateDewPoint(Infinity, 50)).toBe(0)
  })

  it('should return 0 and warn when temperature is below -40°C (out of Magnus range)', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(calculateDewPoint(-50, 50)).toBe(0)
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should return 0 and warn when temperature is above 60°C (out of Magnus range)', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(calculateDewPoint(70, 50)).toBe(0)
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

// Warn-only range check (Issue 21): 46 was typed into both a kitchen temperature
// and an internal moisture % and reached the customer's report unchallenged.
describe('getEnvironmentReadingWarning', () => {
  it('should return null for an in-range indoor temperature', () => {
    expect(getEnvironmentReadingWarning('indoorTemperature', '22')).toBeNull()
  })

  it('should return null for an in-range outdoor temperature', () => {
    expect(getEnvironmentReadingWarning('outdoorTemperature', '18')).toBeNull()
  })

  it('should return null for an in-range indoor humidity', () => {
    expect(getEnvironmentReadingWarning('indoorHumidity', '55')).toBeNull()
  })

  it('should return null for an in-range outdoor humidity', () => {
    expect(getEnvironmentReadingWarning('outdoorHumidity', '62')).toBeNull()
  })

  it('should return null for an in-range moisture reading', () => {
    expect(getEnvironmentReadingWarning('moisture', '18')).toBeNull()
  })

  it('should warn that 46°C is unusually high for an indoor reading', () => {
    expect(getEnvironmentReadingWarning('indoorTemperature', '46')).toContain('Unusually high')
  })

  it('should not warn for 46°C outdoors (Melbourne heatwaves reach it)', () => {
    expect(getEnvironmentReadingWarning('outdoorTemperature', '46')).toBeNull()
  })

  it('should warn that 55°C is unusually high for an outdoor reading', () => {
    expect(getEnvironmentReadingWarning('outdoorTemperature', '55')).toContain('Unusually high')
  })

  it('should warn that 5% is unusually low for indoor humidity', () => {
    expect(getEnvironmentReadingWarning('indoorHumidity', '5')).toContain('Unusually low')
  })

  it('should not warn for 5% outdoor humidity (hot north-wind days reach it)', () => {
    expect(getEnvironmentReadingWarning('outdoorHumidity', '5')).toBeNull()
  })

  it('should not warn for a 46% moisture reading (normal wood-moisture equivalent)', () => {
    expect(getEnvironmentReadingWarning('moisture', '46')).toBeNull()
  })

  it('should warn that a 101% moisture reading is unusually high', () => {
    expect(getEnvironmentReadingWarning('moisture', '101')).toContain('Unusually high')
  })

  it('should warn that a negative indoor temperature is unusually low', () => {
    expect(getEnvironmentReadingWarning('indoorTemperature', '-3')).toContain('Unusually low')
  })

  it('should return null for an empty string', () => {
    expect(getEnvironmentReadingWarning('indoorTemperature', '')).toBeNull()
  })

  it('should return null for a lone minus sign (mid-typing)', () => {
    expect(getEnvironmentReadingWarning('outdoorTemperature', '-')).toBeNull()
  })

  it('should return null for a lone decimal point (mid-typing)', () => {
    expect(getEnvironmentReadingWarning('moisture', '.')).toBeNull()
  })

  it('should return null for non-numeric text', () => {
    expect(getEnvironmentReadingWarning('indoorHumidity', 'abc')).toBeNull()
  })

  it('should return null for whitespace only', () => {
    expect(getEnvironmentReadingWarning('moisture', '   ')).toBeNull()
  })

  it('should name the expected range in the warning text', () => {
    expect(getEnvironmentReadingWarning('indoorTemperature', '46')).toContain('0–40°C')
  })
})

describe('formatCurrency', () => {
  it('should format Australian currency correctly', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1,234.56')
    expect(result).toContain('$')
  })

  it('should format large amounts with comma separators', () => {
    const result = formatCurrency(12345678.90)
    expect(result).toContain('12,345,678.90')
  })

  it('should format zero correctly', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0.00')
  })

  it('should format negative amounts correctly', () => {
    const result = formatCurrency(-500.25)
    expect(result).toContain('500.25')
    // Note: negative format may vary by locale
  })
})
