// Regression cover for the four post-launch note defects. Previously untested.
//
// D1: the picker was `absolute`, so it reserved no flow space and painted over
//     the Add Note / Attach file buttons; Escape shortened the query instead of
//     closing; and selecting a name left the picker open.
// D2: mentions were highlighted off the persisted lead_note_mentions rows, which
//     never contain a self-mention, and styled in a colour 1.22:1 against body text.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
  uploadNoteAttachment: vi.fn(),
  getAttachmentSignedUrl: vi.fn(),
}))

import { LeadNotesSection } from '../LeadNotesSection'
import { toast } from 'sonner'
import { listLeadNotes, listStaffForMentions, createLeadNote } from '@/lib/api/leadNotes'
import {
  listNoteAttachments,
  uploadNoteAttachment,
  getAttachmentSignedUrl,
} from '@/lib/api/leadNoteAttachments'

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
  return render(
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
  vi.mocked(uploadNoteAttachment).mockResolvedValue(undefined as never)
  vi.mocked(createLeadNote).mockResolvedValue(note('saved') as never)
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

describe('LeadNotesSection — staged attachments survive submit', () => {
  it('should upload a staged file when the note is submitted', async () => {
    const user = userEvent.setup()
    const { container } = renderSection()

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['x'], 'report.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })

    await screen.findByText('report.pdf')
    await user.type(await screen.findByLabelText(/add a note/i), 'here is the report')
    await user.click(screen.getByRole('button', { name: /add note/i }))

    await waitFor(() => expect(uploadNoteAttachment).toHaveBeenCalledTimes(1))
  })
})

const OTHER_USER = 'user-glen'

function attachment(overrides = {}) {
  return {
    id: 'att-1',
    note_id: 'note-1',
    lead_id: 'lead-1',
    storage_path: 'lead-1/note-1/report.pdf',
    file_name: 'report.pdf',
    file_size: 2_400_000,
    mime_type: 'application/pdf',
    uploaded_by: AUTHOR_ID,
    created_at: '2026-08-26T01:00:00.000Z',
    deleted_at: null,
    ...overrides,
  }
}

/** One note that already carries one committed attachment. */
function renderWithAttachment(overrides = {}) {
  vi.mocked(listLeadNotes).mockResolvedValue([note('see attached')])
  vi.mocked(listNoteAttachments).mockResolvedValue(
    new Map([['note-1', [attachment(overrides)]]]) as never,
  )
  return renderSection()
}

/** A stand-in for the tab opened synchronously on tap. */
function stubTab() {
  const tab = { location: { replace: vi.fn() }, close: vi.fn(), opener: {} }
  vi.stubGlobal('open', vi.fn(() => tab))
  return tab
}

describe('LeadNotesSection — committed attachments', () => {
  it('should render a committed attachment with its file name', async () => {
    renderWithAttachment()
    expect(await screen.findByText('report.pdf')).toBeInTheDocument()
  })

  it('should render the attachment size in human units', async () => {
    renderWithAttachment()
    expect(await screen.findByText('2.3 MB')).toBeInTheDocument()
  })

  it('should give the open control a 48px touch target', async () => {
    renderWithAttachment()
    const open = await screen.findByRole('button', { name: /open report/i })
    expect(open.className).toContain('h-12 w-12')
  })

  it('should show the remove control to the uploader', async () => {
    renderWithAttachment()
    expect(await screen.findByRole('button', { name: /remove report/i })).toBeInTheDocument()
  })

  it('should hide the remove control from everyone but the uploader', async () => {
    renderWithAttachment({ uploaded_by: OTHER_USER })
    await screen.findByText('report.pdf')
    expect(screen.queryByRole('button', { name: /remove report/i })).not.toBeInTheDocument()
  })
})

describe('LeadNotesSection — opening an attachment', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('should navigate the opened tab to the signed url', async () => {
    const tab = stubTab()
    vi.mocked(getAttachmentSignedUrl).mockResolvedValue('https://signed.example/report.pdf')
    const user = userEvent.setup()
    renderWithAttachment()

    await user.click(await screen.findByRole('button', { name: /open report/i }))

    await waitFor(() =>
      expect(tab.location.replace).toHaveBeenCalledWith('https://signed.example/report.pdf'),
    )
  })

  it('should sign the stored path of the attachment that was clicked', async () => {
    stubTab()
    vi.mocked(getAttachmentSignedUrl).mockResolvedValue('https://signed.example/report.pdf')
    const user = userEvent.setup()
    renderWithAttachment()

    await user.click(await screen.findByRole('button', { name: /open report/i }))

    await waitFor(() =>
      expect(getAttachmentSignedUrl).toHaveBeenCalledWith('lead-1/note-1/report.pdf'),
    )
  })

  it('should open the tab before awaiting, so iOS Safari does not block it', async () => {
    const tab = { location: { replace: vi.fn() }, close: vi.fn(), opener: {} }
    const openSpy = vi.fn(() => tab)
    vi.stubGlobal('open', openSpy)
    let release: (url: string) => void = () => {}
    vi.mocked(getAttachmentSignedUrl).mockReturnValue(
      new Promise<string>((resolve) => {
        release = resolve
      }),
    )
    const user = userEvent.setup()
    renderWithAttachment()

    await user.click(await screen.findByRole('button', { name: /open report/i }))

    // The tab exists while the signing promise is still unresolved.
    expect(openSpy).toHaveBeenCalledTimes(1)
    release('https://signed.example/report.pdf')
  })

  it('should surface an error when the signed url cannot be generated', async () => {
    stubTab()
    vi.mocked(getAttachmentSignedUrl).mockRejectedValue(new Error('Object not found'))
    const user = userEvent.setup()
    renderWithAttachment()

    await user.click(await screen.findByRole('button', { name: /open report/i }))

    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Object not found'))
  })

  it('should close the blank tab when signing fails', async () => {
    const tab = stubTab()
    vi.mocked(getAttachmentSignedUrl).mockRejectedValue(new Error('Object not found'))
    const user = userEvent.setup()
    renderWithAttachment()

    await user.click(await screen.findByRole('button', { name: /open report/i }))

    await waitFor(() => expect(tab.close).toHaveBeenCalledTimes(1))
  })

  it('should never navigate to a url when signing fails', async () => {
    const tab = stubTab()
    vi.mocked(getAttachmentSignedUrl).mockRejectedValue(new Error('Object not found'))
    const user = userEvent.setup()
    renderWithAttachment()

    await user.click(await screen.findByRole('button', { name: /open report/i }))

    await waitFor(() => expect(tab.close).toHaveBeenCalled())
    expect(tab.location.replace).not.toHaveBeenCalled()
  })
})

describe('LeadNotesSection — attaching without typing a note', () => {
  /** Stage a file in the composer without typing anything. */
  async function stageFile(container: HTMLElement, name = 'report.pdf') {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['x'], name, { type: 'application/pdf' })] },
    })
    await screen.findByText(name)
  }

  it('should enable Add Note when a file is staged and nothing is typed', async () => {
    const { container } = renderSection()
    await stageFile(container)

    expect(screen.getByRole('button', { name: /add note/i })).toBeEnabled()
  })

  it('should keep Add Note disabled when nothing is typed and nothing is staged', async () => {
    renderSection()
    await screen.findByLabelText(/add a note/i)

    expect(screen.getByRole('button', { name: /add note/i })).toBeDisabled()
  })

  it('should save a file-only note with a body naming the file', async () => {
    const user = userEvent.setup()
    const { container } = renderSection()
    await stageFile(container)

    await user.click(screen.getByRole('button', { name: /add note/i }))

    await waitFor(() =>
      expect(createLeadNote).toHaveBeenCalledWith(
        expect.objectContaining({ body: 'Attached report.pdf' }),
      ),
    )
  })

  it('should upload the staged file when no text was typed', async () => {
    const user = userEvent.setup()
    const { container } = renderSection()
    await stageFile(container)

    await user.click(screen.getByRole('button', { name: /add note/i }))

    await waitFor(() => expect(uploadNoteAttachment).toHaveBeenCalledTimes(1))
  })

  it('should count the files when several are attached without text', async () => {
    const user = userEvent.setup()
    const { container } = renderSection()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: {
        files: [
          new File(['x'], 'a.pdf', { type: 'application/pdf' }),
          new File(['y'], 'b.pdf', { type: 'application/pdf' }),
        ],
      },
    })
    await screen.findByText('a.pdf')

    await user.click(screen.getByRole('button', { name: /add note/i }))

    await waitFor(() =>
      expect(createLeadNote).toHaveBeenCalledWith(
        expect.objectContaining({ body: 'Attached 2 files' }),
      ),
    )
  })

  it('should keep the typed text when both text and a file are present', async () => {
    const user = userEvent.setup()
    const { container } = renderSection()
    await stageFile(container)
    await user.type(await screen.findByLabelText(/add a note/i), 'roof cavity')

    await user.click(screen.getByRole('button', { name: /add note/i }))

    await waitFor(() =>
      expect(createLeadNote).toHaveBeenCalledWith(
        expect.objectContaining({ body: 'roof cavity' }),
      ),
    )
  })
})
