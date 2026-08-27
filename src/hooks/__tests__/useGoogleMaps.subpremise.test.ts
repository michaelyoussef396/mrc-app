/**
 * The entry point of the dropped-unit bug: Place.fetchFields already requested
 * `addressComponents`, but the parser only ever read five component types and
 * `subpremise` was not one of them, so the unit arrived and was discarded.
 *
 * The three capture sites mock this hook, so without this test a misspelled component
 * type would silently reinstate the bug with every other test still green.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useAddressAutocomplete } from '../useGoogleMaps'

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }))
vi.mock('@/lib/sentry', () => ({ captureBusinessError: vi.fn() }))

interface FakeComponent {
  types: string[]
  longText: string
}

const RICHMOND_UNIT: FakeComponent[] = [
  { types: ['subpremise'], longText: '4' },
  { types: ['street_number'], longText: '12' },
  { types: ['route'], longText: 'Smith Street' },
  { types: ['locality', 'political'], longText: 'Richmond' },
  { types: ['administrative_area_level_1'], longText: 'Victoria' },
  { types: ['postal_code'], longText: '3121' },
]

/** Stand in for the Places library, which is loaded from a script tag at runtime. */
function stubGooglePlaces(addressComponents: FakeComponent[]): void {
  class FakePlace {
    addressComponents: FakeComponent[] = []
    formattedAddress = '4/12 Smith Street, Richmond VIC 3121, Australia'
    location = { lat: () => -37.82, lng: () => 145.0 }
    async fetchFields() {
      this.addressComponents = addressComponents
    }
  }

  ;(globalThis as Record<string, unknown>).google = {
    maps: {
      importLibrary: vi.fn().mockResolvedValue(undefined),
      places: {
        AutocompleteSessionToken: class {},
        Place: FakePlace,
      },
    },
  }
}

beforeEach(() => {
  stubGooglePlaces(RICHMOND_UNIT)
})

afterEach(() => {
  delete (globalThis as Record<string, unknown>).google
})

describe('getPlaceDetails subpremise parsing', () => {
  it('should read the unit from the subpremise component', async () => {
    const { result } = renderHook(() => useAddressAutocomplete({ current: null }))

    const details = await result.current.getPlaceDetails('place-1')

    expect(details?.unit).toBe('4')
  })

  it('should leave the unit undefined when the place has no subpremise', async () => {
    stubGooglePlaces(RICHMOND_UNIT.filter((c) => !c.types.includes('subpremise')))
    const { result } = renderHook(() => useAddressAutocomplete({ current: null }))

    const details = await result.current.getPlaceDetails('place-1')

    expect(details?.unit).toBeUndefined()
  })

  it('should still read the street number alongside the unit', async () => {
    const { result } = renderHook(() => useAddressAutocomplete({ current: null }))

    const details = await result.current.getPlaceDetails('place-1')

    expect(details?.street_number).toBe('12')
  })
})
