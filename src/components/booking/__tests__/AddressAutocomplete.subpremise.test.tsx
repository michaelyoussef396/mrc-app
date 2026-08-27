/**
 * Capture site 1 of 3 (AddressAutocomplete / LeadBookingCard / CreateNewLeadModal).
 *
 * All three must emit the identical string for the same Places result — drift between
 * them is the failure this guards — so the expectation is a literal here rather than a
 * call to the formatter under test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockGetPlaceDetails } = vi.hoisted(() => ({ mockGetPlaceDetails: vi.fn() }))

const PREDICTION = {
  place_id: 'place-1',
  description: '12 Smith Street, Richmond VIC 3121, Australia',
  structured_formatting: {
    main_text: '12 Smith Street',
    secondary_text: 'Richmond VIC 3121, Australia',
  },
}

const HOUSE_PLACE = {
  formatted_address: '12 Smith Street, Richmond VIC 3121, Australia',
  street_number: '12',
  street_name: 'Smith Street',
  suburb: 'Richmond',
  state: 'Victoria',
  postcode: '3121',
  lat: -37.82,
  lng: 145.0,
}

vi.mock('@/hooks/useGoogleMaps', () => ({
  useLoadGoogleMaps: () => ({ isLoaded: true, error: null }),
  useAddressAutocomplete: () => ({
    predictions: [PREDICTION],
    isLoading: false,
    getPlacePredictions: vi.fn(),
    getPlaceDetails: mockGetPlaceDetails,
    clearPredictions: vi.fn(),
  }),
}))

import { AddressAutocomplete } from '../AddressAutocomplete'

/** Type enough to open the dropdown, then pick the single prediction. */
async function captureTheAddress(): Promise<void> {
  const user = userEvent.setup()
  await user.type(screen.getByPlaceholderText('Start typing an address...'), 'smith')
  await user.click(await screen.findByRole('button', { name: /12 Smith Street/i }))
}

beforeEach(() => {
  mockGetPlaceDetails.mockReset()
})

describe('AddressAutocomplete address capture', () => {
  it('should emit the unit in slash notation when Places returns a subpremise', async () => {
    mockGetPlaceDetails.mockResolvedValue({ ...HOUSE_PLACE, unit: '4' })
    const onChange = vi.fn()

    render(<AddressAutocomplete onChange={onChange} />)
    await captureTheAddress()

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ street: '4/12 Smith Street' }),
      ),
    )
  })

  it('should emit the plain street line when Places returns no subpremise', async () => {
    mockGetPlaceDetails.mockResolvedValue(HOUSE_PLACE)
    const onChange = vi.fn()

    render(<AddressAutocomplete onChange={onChange} />)
    await captureTheAddress()

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ street: '12 Smith Street' })),
    )
  })

  it('should keep the unit with its street number when Places returns no street components', async () => {
    mockGetPlaceDetails.mockResolvedValue({
      formatted_address: 'Unit 4, 12 Smith Street, Richmond VIC 3121, Australia',
      unit: '4',
      lat: -37.82,
      lng: 145.0,
    })
    const onChange = vi.fn()

    render(<AddressAutocomplete onChange={onChange} />)
    await captureTheAddress()

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ street: '4/12 Smith Street' }),
      ),
    )
  })
})
