// Regression cover for the four post-launch note defects. Previously untested.
//
// D1: the picker was `absolute`, so it reserved no flow space and painted over
//     the Add Note / Attach file buttons; Escape shortened the query instead of
//     closing; and selecting a name left the picker open.
// D2: mentions were highlighted off the persisted lead_note_mentions rows, which
//     never contain a self-mention, and styled in a colour 1.22:1 against body text.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const AUTHOR_ID = 'user-michael'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: AUTHOR_ID, email: 'michael@example.com' },
    profile: { full_name: 'Michael Rodriguez' },
  }),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/lib/api/leadNoteSlack', () => ({ postLeadNoteToSlack: vi.fn() }))

// Only the network boundary is faked. segmentNoteBody / parseMentions stay real —
// they are the logic under test.
vi.mock('@/lib/api/leadNotes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/leadNotes')>()),
  listLeadNotes: vi.fn(),
  listStaffForMentions: vi.fn(),
  createLeadNote: vi.fn(),
  addLeadNoteMentions: vi.fn(),
  softDeleteLeadNote: vi.fn(),
}))

vi.mock('@/lib/api/leadNoteAttachments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/leadNoteAttachments')>()),
  listNoteAttachments: vi.fn(),
}))

import { LeadNotesSection } from '../LeadNotesSection'
import { listLeadNotes, listStaffForMentions } from '@/lib/api/leadNotes'
import { listNoteAttachments } from '@/lib/api/leadNoteAttachments'

const STAFF = [
  { id: 'user-glen', fullName: 'Glen Marshall' },
  { id: AUTHOR_ID, fullName: 'Michael Rodriguez' },
]

function note(body: string, id = 'note-1') {
  return {
    id,
    lead_id: 'lead-1',
    author_id: AUTHOR_ID,
    body,
    created_at: '2026-08-26T01:00:00.000Z',
    updated_at: '2026-08-26T01:00:00.000Z',
    deleted_at: null,
    authorName: 'Michael Rodriguez',
  }
}

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <LeadNotesSection leadId="lead-1" leadName="Jane Citizen" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listLeadNotes).mockResolvedValue([])
  vi.mocked(listStaffForMentions).mockResolvedValue(STAFF)
  vi.mocked(listNoteAttachments).mockResolvedValue(new Map())
})

/** Type an @-query into the composer and wait for the picker. */
async function openPicker(text = '@Gl') {
  const user = userEvent.setup()
  const textarea = await screen.findByLabelText(/add a note/i)
  await user.type(textarea, text)
  await screen.findByRole('listbox')
  return { user, textarea }
}

describe('LeadNotesSection — mention picker (D1)', () => {
  it('should open the picker while an @ query is being typed', async () => {
    renderSection()
    await openPicker()

    expect(screen.getByRole('option', { name: /Glen Marshall/ })).toBeInTheDocument()
  })

  it('should keep the Add Note button reachable while the picker is open', async () => {
    renderSection()
    await openPicker()

    expect(screen.getByRole('button', { name: /add note/i })).toBeEnabled()
  })

  it('should keep the Attach file button reachable while the picker is open', async () => {
    renderSection()
    await openPicker()

    expect(screen.getByRole('button', { name: /attach file/i })).toBeEnabled()
  })

  it('should render the picker in normal flow so it cannot overlap the buttons', async () => {
    // Class-level assertion on purpose: `absolute` is the exact regression. An
    // out-of-flow box reserves no space, which is what buried the button row.
    renderSection()
    await openPicker()

    expect(screen.getByRole('listbox').className).not.toContain('absolute')
  })

  it('should close the picker when Escape is pressed', async () => {
    renderSection()
    const { user } = await openPicker()

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  })

  it('should keep the typed query intact when Escape closes the picker', async () => {
    renderSection()
    const { user, textarea } = await openPicker()

    await user.keyboard('{Escape}')

    expect(textarea).toHaveValue('@Gl')
  })

  it('should close the picker once a name has been selected', async () => {
    renderSection()
    const { user } = await openPicker()

    await user.click(screen.getByRole('option', { name: /Glen Marshall/ }))

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  })

  it('should insert the selected name into the draft', async () => {
    renderSection()
    const { user, textarea } = await openPicker()

    await user.click(screen.getByRole('option', { name: /Glen Marshall/ }))

    expect(textarea).toHaveValue('@Glen Marshall ')
  })
})

describe('LeadNotesSection — mention rendering (D2)', () => {
  it('should wrap a resolved mention in its own element', async () => {
    vi.mocked(listLeadNotes).mockResolvedValue([note('@Glen Marshall can you call them')])
    renderSection()

    expect(await screen.findByText('@Glen Marshall')).toBeInTheDocument()
  })

  it('should style a mention differently from the surrounding text', async () => {
    vi.mocked(listLeadNotes).mockResolvedValue([note('@Glen Marshall can you call them')])
    renderSection()

    const mention = await screen.findByText('@Glen Marshall')
    expect(mention.className).not.toBe('')
  })

  it('should highlight a self-mention, which is never persisted as a mention row', async () => {
    vi.mocked(listLeadNotes).mockResolvedValue([note('@Michael Rodriguez can you see this')])
    renderSection()

    expect(await screen.findByText('@Michael Rodriguez')).toBeInTheDocument()
  })

  it('should leave a note without mentions unstyled', async () => {
    vi.mocked(listLeadNotes).mockResolvedValue([note('Called the customer, no answer.')])
    renderSection()

    const body = await screen.findByText('Called the customer, no answer.')
    expect(body.tagName).toBe('SPAN')
  })
})
