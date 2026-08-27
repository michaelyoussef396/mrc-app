/**
 * Capture site 2 of 3 (AddressAutocomplete / LeadBookingCard / CreateNewLeadModal).
 *
 * The expectation is a literal, not a call to the formatter under test: the point is
 * that all three capture sites agree on one string for one Places result.
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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ insert: () => Promise.resolve({ error: null }) }) },
}))

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'admin-1' } }) }))

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

vi.mock('@/lib/api/notifications', () => ({ sendSlackNotification: vi.fn() }))
vi.mock('@/lib/sentry', () => ({ captureBusinessError: vi.fn() }))
vi.mock('@/lib/api/leadDuplicates', () => ({ findDuplicateLead: vi.fn().mockResolvedValue(null) }))

import CreateNewLeadModal from '../CreateNewLeadModal'

/** The street field doubles as the Places search box. */
function theAddressField(): HTMLInputElement {
  return screen.getByPlaceholderText('Start typing address...') as HTMLInputElement
}

async function captureTheAddress(): Promise<void> {
  const user = userEvent.setup()
  await user.type(theAddressField(), 'smith')
  await user.click(await screen.findByRole('button', { name: /12 Smith Street/i }))
}

beforeEach(() => {
  mockGetPlaceDetails.mockReset()
})

describe('CreateNewLeadModal address capture', () => {
  it('should store the unit in slash notation when Places returns a subpremise', async () => {
    mockGetPlaceDetails.mockResolvedValue({ ...HOUSE_PLACE, unit: '4' })

    render(<CreateNewLeadModal isOpen onClose={vi.fn()} />)
    await captureTheAddress()

    await waitFor(() => expect(theAddressField().value).toBe('4/12 Smith Street'))
  })

  it('should store the plain street line when Places returns no subpremise', async () => {
    mockGetPlaceDetails.mockResolvedValue(HOUSE_PLACE)

    render(<CreateNewLeadModal isOpen onClose={vi.fn()} />)
    await captureTheAddress()

    await waitFor(() => expect(theAddressField().value).toBe('12 Smith Street'))
  })

  it('should keep the unit with its street number when Places returns no street components', async () => {
    mockGetPlaceDetails.mockResolvedValue({
      formatted_address: 'Unit 4, 12 Smith Street, Richmond VIC 3121, Australia',
      unit: '4',
      suburb: 'Richmond',
      postcode: '3121',
    })

    render(<CreateNewLeadModal isOpen onClose={vi.fn()} />)
    await captureTheAddress()

    await waitFor(() => expect(theAddressField().value).toBe('4/12 Smith Street'))
  })

  it('should not strand a bare unit when the Places lookup fails entirely', async () => {
    mockGetPlaceDetails.mockResolvedValue(null)

    render(
      <CreateNewLeadModal isOpen onClose={vi.fn()} />,
    )
    const user = userEvent.setup()
    await user.type(theAddressField(), 'smith')
    await user.click(await screen.findByRole('button', { name: /12 Smith Street/i }))

    await waitFor(() => expect(theAddressField().value).toBe('12 Smith Street'))
  })
})
