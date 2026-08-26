// File attachments on internal lead notes. The behaviour that matters most is
// the rollback: a row insert that fails must remove the object it just wrote,
// so a failed attach never leaves billable bytes nothing references.

import { describe, it, expect, vi, beforeEach } from 'vitest'

let uploadError: { message: string } | null = null
let insertError: { message: string } | null = null
let updateError: { message: string } | null = null
let updatedRows: Array<{ id: string }> = []
let signedUrlError: { message: string } | null = null

const uploaded: Array<{ path: string; options: Record<string, unknown> }> = []
const removed: string[][] = []

const INSERTED_ROW = {
  id: 'attachment-1',
  note_id: 'note-1',
  lead_id: 'lead-1',
  storage_path: 'lead-1/note-1/uuid-quote.pdf',
  file_name: 'quote.pdf',
  file_size: 1024,
  mime_type: 'application/pdf',
  uploaded_by: 'user-vryan',
  created_at: '2026-08-26T01:00:00.000Z',
  deleted_at: null,
}

function createFakeQuery() {
  let mode: 'select' | 'insert' | 'update' = 'select'
  const builder: Record<string, unknown> = {
    insert: () => {
      mode = 'insert'
      return builder
    },
    update: () => {
      mode = 'update'
      return builder
    },
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    order: () => builder,
    single: () =>
      Promise.resolve(
        insertError ? { data: null, error: insertError } : { data: INSERTED_ROW, error: null },
      ),
    then: (onFulfilled: (value: unknown) => unknown) => {
      const settled =
        mode === 'update'
          ? updateError
            ? { data: null, error: updateError }
            : { data: updatedRows, error: null }
          : { data: [], error: null }
      return Promise.resolve(settled).then(onFulfilled)
    },
  }
  return builder
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => createFakeQuery(),
    storage: {
      from: () => ({
        upload: (path: string, _file: File, options: Record<string, unknown>) => {
          uploaded.push({ path, options })
          return Promise.resolve(
            uploadError ? { data: null, error: uploadError } : { data: { path }, error: null },
          )
        },
        remove: (paths: string[]) => {
          removed.push(paths)
          return Promise.resolve({ data: null, error: null })
        },
        createSignedUrl: () =>
          Promise.resolve(
            signedUrlError
              ? { data: null, error: signedUrlError }
              : { data: { signedUrl: 'https://example.test/signed' }, error: null },
          ),
      }),
    },
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-vryan' } } }) },
  },
}))

vi.mock('@/lib/sentry', () => ({ captureBusinessError: vi.fn() }))

import {
  formatFileSize,
  getAttachmentSignedUrl,
  softDeleteAttachment,
  uploadNoteAttachment,
  validateAttachment,
  LeadNoteAttachmentError,
  MAX_ATTACHMENT_BYTES,
} from '../leadNoteAttachments'

function makeFile(name: string, type: string, size = 1024): File {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

beforeEach(() => {
  vi.clearAllMocks()
  uploadError = null
  insertError = null
  updateError = null
  signedUrlError = null
  updatedRows = [{ id: 'attachment-1' }]
  uploaded.length = 0
  removed.length = 0
})

describe('validateAttachment', () => {
  it('should accept a PDF within the size limit', () => {
    expect(() => validateAttachment(makeFile('quote.pdf', 'application/pdf'))).not.toThrow()
  })

  it('should accept an archive, which the bucket allowlist permits', () => {
    expect(() => validateAttachment(makeFile('photos.zip', 'application/zip'))).not.toThrow()
  })

  it('should reject a file over the 25 MiB bucket limit', () => {
    const tooBig = makeFile('huge.pdf', 'application/pdf', MAX_ATTACHMENT_BYTES + 1)
    expect(() => validateAttachment(tooBig)).toThrow(LeadNoteAttachmentError)
  })

  it('should report TOO_LARGE for an oversized file', () => {
    const tooBig = makeFile('huge.pdf', 'application/pdf', MAX_ATTACHMENT_BYTES + 1)
    expect(() => validateAttachment(tooBig)).toThrowError(
      expect.objectContaining({ code: 'TOO_LARGE' }),
    )
  })

  it('should reject a file the browser could not type', () => {
    expect(() => validateAttachment(makeFile('mystery.xyz', ''))).toThrowError(
      expect.objectContaining({ code: 'UNKNOWN_TYPE' }),
    )
  })

  it('should reject a type outside the bucket allowlist', () => {
    expect(() => validateAttachment(makeFile('run.exe', 'application/x-msdownload'))).toThrowError(
      expect.objectContaining({ code: 'UNSUPPORTED_TYPE' }),
    )
  })

  it('should name the offending file in the message so the user knows which one failed', () => {
    const tooBig = makeFile('site-survey.pdf', 'application/pdf', MAX_ATTACHMENT_BYTES + 1)
    expect(() => validateAttachment(tooBig)).toThrow(/site-survey\.pdf/)
  })
})

describe('uploadNoteAttachment', () => {
  it('should return the recorded attachment row', async () => {
    const result = await uploadNoteAttachment({
      noteId: 'note-1',
      leadId: 'lead-1',
      file: makeFile('quote.pdf', 'application/pdf'),
    })
    expect(result).toEqual(INSERTED_ROW)
  })

  it('should key the object under the lead id so storage RLS can delegate to the lead', async () => {
    await uploadNoteAttachment({
      noteId: 'note-1',
      leadId: 'lead-1',
      file: makeFile('quote.pdf', 'application/pdf'),
    })
    expect(uploaded[0].path.startsWith('lead-1/note-1/')).toBe(true)
  })

  it('should send the real content type rather than a hard-coded one', async () => {
    await uploadNoteAttachment({
      noteId: 'note-1',
      leadId: 'lead-1',
      file: makeFile('sheet.csv', 'text/csv'),
    })
    expect(uploaded[0].options).toEqual({ contentType: 'text/csv', upsert: false })
  })

  it('should reject an oversized file before uploading anything', async () => {
    const tooBig = makeFile('huge.pdf', 'application/pdf', MAX_ATTACHMENT_BYTES + 1)
    await expect(
      uploadNoteAttachment({ noteId: 'note-1', leadId: 'lead-1', file: tooBig }),
    ).rejects.toMatchObject({ code: 'TOO_LARGE' })
  })

  it('should not touch storage when validation fails', async () => {
    const tooBig = makeFile('huge.pdf', 'application/pdf', MAX_ATTACHMENT_BYTES + 1)
    await uploadNoteAttachment({ noteId: 'note-1', leadId: 'lead-1', file: tooBig }).catch(() => {})
    expect(uploaded).toEqual([])
  })

  it('should throw UPLOAD_FAILED when storage rejects the object', async () => {
    uploadError = { message: 'mime type not allowed' }
    await expect(
      uploadNoteAttachment({
        noteId: 'note-1',
        leadId: 'lead-1',
        file: makeFile('quote.pdf', 'application/pdf'),
      }),
    ).rejects.toMatchObject({ code: 'UPLOAD_FAILED' })
  })

  it('should remove the uploaded object when the row insert fails', async () => {
    insertError = { message: 'new row violates row-level security policy' }
    await uploadNoteAttachment({
      noteId: 'note-1',
      leadId: 'lead-1',
      file: makeFile('quote.pdf', 'application/pdf'),
    }).catch(() => {})
    expect(removed).toEqual([[uploaded[0].path]])
  })

  it('should throw INSERT_FAILED when the row insert fails', async () => {
    insertError = { message: 'new row violates row-level security policy' }
    await expect(
      uploadNoteAttachment({
        noteId: 'note-1',
        leadId: 'lead-1',
        file: makeFile('quote.pdf', 'application/pdf'),
      }),
    ).rejects.toMatchObject({ code: 'INSERT_FAILED' })
  })

  it('should leave no orphaned object behind on a successful attach', async () => {
    await uploadNoteAttachment({
      noteId: 'note-1',
      leadId: 'lead-1',
      file: makeFile('quote.pdf', 'application/pdf'),
    })
    expect(removed).toEqual([])
  })
})

describe('softDeleteAttachment', () => {
  it('should resolve when a row was stamped', async () => {
    await expect(softDeleteAttachment('attachment-1')).resolves.toBeUndefined()
  })

  it('should throw DELETE_FAILED when no row matched (not the uploader, or already gone)', async () => {
    updatedRows = []
    await expect(softDeleteAttachment('attachment-1')).rejects.toMatchObject({
      code: 'DELETE_FAILED',
    })
  })

  it('should throw DELETE_FAILED when the database rejects the update', async () => {
    updateError = { message: 'permission denied' }
    await expect(softDeleteAttachment('attachment-1')).rejects.toMatchObject({
      code: 'DELETE_FAILED',
    })
  })
})

describe('getAttachmentSignedUrl', () => {
  it('should return the signed url', async () => {
    await expect(getAttachmentSignedUrl('lead-1/note-1/quote.pdf')).resolves.toBe(
      'https://example.test/signed',
    )
  })

  it('should throw SIGNED_URL_FAILED when signing fails', async () => {
    signedUrlError = { message: 'object not found' }
    await expect(getAttachmentSignedUrl('missing')).rejects.toMatchObject({
      code: 'SIGNED_URL_FAILED',
    })
  })
})

describe('formatFileSize', () => {
  it('should render bytes below a kilobyte', () => {
    expect(formatFileSize(512)).toBe('512 B')
  })

  it('should render kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('should render megabytes', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
