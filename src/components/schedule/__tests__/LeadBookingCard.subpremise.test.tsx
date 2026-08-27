/**
 * Capture site 3 of 3 (AddressAutocomplete / LeadBookingCard / CreateNewLeadModal).
 *
 * The expectation is a literal, not a call to the formatter under test: the point is
 * that all three capture sites agree on one string for one Places result.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import type { LeadToSchedule } from '@/hooks/useLeadsToSchedule'

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
  supabase: {
    from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
  },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1', email: 'admin@example.com' }, profile: null }),
}))

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

vi.mock('@/hooks/useBookingValidation', () => ({
  useBookingValidation: () => ({
    getRecommendedDates: vi.fn().mockResolvedValue({ status: 'empty', recommendations: [] }),
    checkAvailability: vi.fn().mockResolvedValue({ status: 'failed' }),
  }),
  RECOMMENDED_DATES_FAILURE_MESSAGES: { network: '' },
  AVAILABILITY_FAILURE_MESSAGES: { network: '' },
  formatTimeDisplay: (value: string) => value,
}))

vi.mock('@/hooks/useLeadUpdate', () => ({
  useLeadUpdate: () => ({ updateLead: vi.fn().mockResolvedValue(true), isUpdating: false }),
}))

vi.mock('@/lib/bookingService', () => ({
  bookInspection: vi.fn(),
  checkBookingConflict: vi.fn().mockResolvedValue({ hasConflict: false }),
  formatTimeForDisplay: (value: string) => value,
}))

vi.mock('@/lib/sentry', () => ({ captureBusinessError: vi.fn() }))

import { LeadBookingCard } from '../LeadBookingCard'

const LEAD: LeadToSchedule = {
  id: 'lead-1',
  leadNumber: 'L-001',
  fullName: 'Jane Doe',
  displayName: 'Jane Doe',
  initials: 'JD',
  suburb: 'Richmond',
  propertyType: 'House',
  phone: '0400 000 000',
  email: 'jane@example.com',
  issueDescription: null,
  leadSource: null,
  propertyAddress: '1 Old Street',
  preferredDate: null,
  preferredTime: null,
  internalNotes: null,
  createdAt: '2026-08-01T00:00:00Z',
  timeAgo: '1d ago',
  scheduleType: 'inspection',
  status: 'new_lead',
}

function renderCard() {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient()}>
        <LeadBookingCard lead={LEAD} technicians={[]} isExpanded onToggle={vi.fn()} />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

/** Open the Places search, type, and pick the single prediction. */
async function captureTheAddress(): Promise<HTMLInputElement> {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /update address/i }))
  const field = screen.getByPlaceholderText('Search for address...') as HTMLInputElement
  await user.type(field, 'smith')
  await user.click(await screen.findByRole('button', { name: /12 Smith Street/i }))
  return field
}

beforeEach(() => {
  mockGetPlaceDetails.mockReset()
})

describe('LeadBookingCard address capture', () => {
  it('should show the unit in slash notation when Places returns a subpremise', async () => {
    mockGetPlaceDetails.mockResolvedValue({ ...HOUSE_PLACE, unit: '4' })

    renderCard()
    const field = await captureTheAddress()

    await waitFor(() => expect(field.value).toBe('4/12 Smith Street'))
  })

  it('should show the plain street line when Places returns no subpremise', async () => {
    mockGetPlaceDetails.mockResolvedValue(HOUSE_PLACE)

    renderCard()
    const field = await captureTheAddress()

    await waitFor(() => expect(field.value).toBe('12 Smith Street'))
  })

  it('should keep the unit with its street number when Places returns no street components', async () => {
    mockGetPlaceDetails.mockResolvedValue({
      formatted_address: 'Unit 4, 12 Smith Street, Richmond VIC 3121, Australia',
      unit: '4',
      suburb: 'Richmond',
      postcode: '3121',
    })

    renderCard()
    const field = await captureTheAddress()

    await waitFor(() => expect(field.value).toBe('4/12 Smith Street'))
  })

  it('should not strand a bare unit when the Places lookup fails entirely', async () => {
    mockGetPlaceDetails.mockResolvedValue(null)

    renderCard()
    const field = await captureTheAddress()

    await waitFor(() => expect(field.value).toBe('12 Smith Street'))
  })
})
