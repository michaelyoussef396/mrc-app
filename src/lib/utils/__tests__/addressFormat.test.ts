/**
 * Google returns the unit as a separate `subpremise` component. It used to be dropped,
 * so "Unit 4, 12 Smith St" was stored as "12 Smith St" — and on the fallback path an
 * address could come back as the unit alone, with no street number at all.
 *
 * The stored form is Australian slash notation, matching the rows staff already type
 * by hand, so existing address consumers need no change.
 */

import { describe, it, expect } from 'vitest'

import { buildStreetLine, fallbackStreetLine } from '../addressFormat'

const HOUSE = {
  formatted_address: '12 Smith Street, Richmond VIC 3121, Australia',
  street_number: '12',
  street_name: 'Smith Street',
}

const UNIT = { ...HOUSE, unit: '4' }

describe('buildStreetLine with a subpremise', () => {
  it('should prepend the unit in slash notation', () => {
    expect(buildStreetLine(UNIT)).toBe('4/12 Smith Street')
  })

  it('should strip a written unit word from the subpremise value', () => {
    expect(buildStreetLine({ ...HOUSE, unit: 'Unit 4' })).toBe('4/12 Smith Street')
  })

  it('should keep an alphanumeric unit designator intact', () => {
    expect(buildStreetLine({ ...HOUSE, unit: '12B' })).toBe('12B/12 Smith Street')
  })

  it('should keep a non-numeric subpremise verbatim rather than stripping its first letter', () => {
    expect(buildStreetLine({ ...HOUSE, unit: 'Upper' })).toBe('Upper/12 Smith Street')
  })
})

describe('buildStreetLine without a subpremise', () => {
  it('should return the street line unchanged', () => {
    expect(buildStreetLine(HOUSE)).toBe('12 Smith Street')
  })

  it('should ignore an empty subpremise', () => {
    expect(buildStreetLine({ ...HOUSE, unit: '' })).toBe('12 Smith Street')
  })
})

describe('buildStreetLine fallback when Places returns no street components', () => {
  it('should fold a unit-only first segment together with the street segment', () => {
    expect(
      buildStreetLine({
        formatted_address: 'Unit 4, 12 Smith Street, Richmond VIC 3121, Australia',
        unit: '4',
      }),
    ).toBe('4/12 Smith Street')
  })

  it('should never return a unit without a street number', () => {
    expect(
      buildStreetLine({ formatted_address: 'Unit 4, 12 Smith Street, Richmond VIC', unit: '4' }),
    ).not.toBe('Unit 4')
  })

  it('should never return a street number without its unit', () => {
    expect(
      buildStreetLine({ formatted_address: '141 Liverpool Road, Kilsyth VIC 3137', unit: '3' }),
    ).toBe('3/141 Liverpool Road')
  })

  it('should not double the unit when the segment already carries slash notation', () => {
    expect(
      buildStreetLine({ formatted_address: '4/12 Smith Street, Richmond VIC', unit: '4' }),
    ).toBe('4/12 Smith Street')
  })

  it('should not double the unit when the segment already spells it out', () => {
    expect(
      buildStreetLine({ formatted_address: 'Unit 4 12 Smith Street, Richmond VIC', unit: '4' }),
    ).toBe('Unit 4 12 Smith Street')
  })

  it('should return the plain street segment when there is no unit', () => {
    expect(buildStreetLine({ formatted_address: '12 Smith Street, Richmond VIC 3121' })).toBe(
      '12 Smith Street',
    )
  })

  it('should return an empty string when Places gave nothing usable', () => {
    expect(buildStreetLine({ formatted_address: '' })).toBe('')
  })

  it('should fall back when only the street number is missing', () => {
    expect(
      buildStreetLine({ formatted_address: '12 Smith Street, Richmond VIC', street_name: 'Smith Street' }),
    ).toBe('12 Smith Street')
  })
})

describe('fallbackStreetLine on a bare prediction string', () => {
  it('should take the street segment', () => {
    expect(fallbackStreetLine('12 Smith Street, Richmond VIC 3121, Australia')).toBe(
      '12 Smith Street',
    )
  })

  it('should fold a unit-only segment into the street segment', () => {
    expect(fallbackStreetLine('Unit 4, 12 Smith Street, Richmond VIC 3121')).toBe(
      '4/12 Smith Street',
    )
  })

  it('should preserve slash notation already present in the prediction', () => {
    expect(fallbackStreetLine('4/12 Smith Street, Richmond VIC 3121')).toBe('4/12 Smith Street')
  })

  it('should return an empty string for an empty prediction', () => {
    expect(fallbackStreetLine('')).toBe('')
  })

  it('should return an empty string for an undefined prediction', () => {
    expect(fallbackStreetLine(undefined)).toBe('')
  })
})
