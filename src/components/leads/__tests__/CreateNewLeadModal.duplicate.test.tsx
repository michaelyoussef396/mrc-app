// The duplicate check is advisory: the Save click that first discovers a
// collision must still insert, with the warning rendered alongside — a Save
// that appears to do nothing reads as a broken button to a technician.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockInsertLead, mockFindDuplicateLead } = vi.hoisted(() => ({
  mockInsertLead: vi.fn(),
  mockFindDuplicateLead: vi.fn(),
}))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) =>
      table === 'leads'
        ? { insert: mockInsertLead }
        : { insert: () => Promise.resolve({ error: null }) },
  },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1' } }),
}))

vi.mock('@/hooks/useGoogleMaps', () => ({
  useLoadGoogleMaps: () => ({ isLoaded: false }),
  useAddressAutocomplete: () => ({
    predictions: [],
    getPlacePredictions: vi.fn(),
    getPlaceDetails: vi.fn(),
    clearPredictions: vi.fn(),
  }),
}))

vi.mock('@/lib/api/notifications', () => ({ sendSlackNotification: vi.fn() }))
vi.mock('@/lib/sentry', () => ({ captureBusinessError: vi.fn() }))
vi.mock('@/lib/api/leadDuplicates', () => ({ findDuplicateLead: mockFindDuplicateLead }))

import CreateNewLeadModal from '../CreateNewLeadModal'

const UNSEEN_DUPLICATE = { id: 'lead-existing', fullName: 'Jane Citizen', matchType: 'email address' as const }

function fillValidForm() {
  // fireEvent.change does not blur, so the duplicate stays "unseen" until Save.
  fireEvent.change(screen.getByPlaceholderText('e.g. John Smith'), { target: { value: 'Jane Citizen' } })
  fireEvent.change(screen.getByPlaceholderText('04XX XXX XXX'), { target: { value: '0412345678' } })
  fireEvent.change(screen.getByPlaceholderText('email@example.com'), { target: { value: 'jane@example.com' } })
  fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: '12 Example Street' } })
  fireEvent.change(screen.getByPlaceholderText('e.g. Melbourne'), { target: { value: 'Brunswick' } })
  fireEvent.change(screen.getByPlaceholderText('e.g. 3000'), { target: { value: '3056' } })
  fireEvent.change(screen.getByPlaceholderText('Describe the mould issue in detail...'), {
    target: { value: 'Black mould spreading across the bathroom ceiling.' },
  })
  fireEvent.change(screen.getByDisplayValue('Select lead source...'), { target: { value: 'website' } })
}

async function saveWithUnseenDuplicate() {
  render(<CreateNewLeadModal isOpen onClose={vi.fn()} />)
  fillValidForm()
  await userEvent.click(screen.getByRole('button', { name: /create lead/i }))
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockFindDuplicateLead.mockResolvedValue(UNSEEN_DUPLICATE)
  mockInsertLead.mockReturnValue({
    select: () => ({ single: () => Promise.resolve({ data: { id: 'lead-new' }, error: null }) }),
  })
})

describe('CreateNewLeadModal — first Save with an unseen duplicate', () => {
  it('should insert the lead on the first click', async () => {
    await saveWithUnseenDuplicate()

    await waitFor(() => expect(mockInsertLead).toHaveBeenCalledTimes(1))
  })

  it('should insert the lead payload the user typed', async () => {
    await saveWithUnseenDuplicate()

    await waitFor(() =>
      expect(mockInsertLead).toHaveBeenCalledWith(expect.objectContaining({ email: 'jane@example.com' })),
    )
  })

  it('should reach the success state', async () => {
    await saveWithUnseenDuplicate()

    expect(await screen.findByText('Lead Created Successfully!')).toBeInTheDocument()
  })

  it('should still surface the duplicate warning', async () => {
    await saveWithUnseenDuplicate()

    expect(await screen.findByText('Possible duplicate lead')).toBeInTheDocument()
  })

  it('should link the colliding lead by name', async () => {
    await saveWithUnseenDuplicate()

    expect(await screen.findByRole('link', { name: 'Jane Citizen' })).toHaveAttribute('href', '/leads/lead-existing')
  })
})

describe('CreateNewLeadModal — blur-triggered duplicate check', () => {
  it('should run the duplicate check when the phone field loses focus', async () => {
    render(<CreateNewLeadModal isOpen onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('04XX XXX XXX'), { target: { value: '0412345678' } })

    fireEvent.blur(screen.getByPlaceholderText('04XX XXX XXX'))

    await waitFor(() =>
      expect(mockFindDuplicateLead).toHaveBeenCalledWith({ phone: '0412 345 678', email: '' }),
    )
  })

  it('should show the warning before Save when the email field loses focus', async () => {
    render(<CreateNewLeadModal isOpen onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('email@example.com'), { target: { value: 'jane@example.com' } })

    fireEvent.blur(screen.getByPlaceholderText('email@example.com'))

    expect(await screen.findByText('Possible duplicate lead')).toBeInTheDocument()
  })
})
