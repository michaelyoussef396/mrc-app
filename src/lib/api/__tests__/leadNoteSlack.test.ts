// The single Slack formatter both note surfaces share. Pins the two headings
// (a mention must never read like a plain note), the Australian name list, and
// the truncation rule: the body gives way, the heading and file list never do.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const invokeMock = vi.fn()

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: 1, error: null }),
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}))

import { formatLeadNoteSlackMessage, postLeadNoteToSlack } from '../leadNoteSlack'

const LEAD_ID = '11111111-1111-1111-1111-111111111111'
const BASE = {
  leadId: LEAD_ID,
  leadName: 'Jane Citizen',
  authorName: 'Michael Rodriguez',
  body: 'Called, no answer.',
}

beforeEach(() => {
  vi.clearAllMocks()
  invokeMock.mockResolvedValue({ data: { success: true }, error: null })
})

describe('formatLeadNoteSlackMessage — plain note', () => {
  it('should lead a plain note with the note emoji', () => {
    expect(formatLeadNoteSlackMessage(BASE).startsWith('📝')).toBe(true)
  })

  it('should name the lead in the heading', () => {
    expect(formatLeadNoteSlackMessage(BASE)).toContain('*New note on Jane Citizen*')
  })

  it('should name the author in the heading', () => {
    expect(formatLeadNoteSlackMessage(BASE)).toContain('— Michael Rodriguez')
  })

  it('should carry the note body', () => {
    expect(formatLeadNoteSlackMessage(BASE)).toContain('Called, no answer.')
  })

  it('should trim surrounding whitespace from the body', () => {
    expect(formatLeadNoteSlackMessage({ ...BASE, body: '  hi  ' })).toContain('\nhi')
  })
})

describe('formatLeadNoteSlackMessage — mention note', () => {
  const mention = { ...BASE, mentionedNames: ['Glen Marshall'] }

  it('should lead a mention note with the bell emoji', () => {
    expect(formatLeadNoteSlackMessage(mention).startsWith('🔔')).toBe(true)
  })

  it('should not reuse the plain-note heading for a mention', () => {
    expect(formatLeadNoteSlackMessage(mention)).not.toContain('New note on')
  })

  it('should name the person who was tagged', () => {
    expect(formatLeadNoteSlackMessage(mention)).toContain('mentioned Glen Marshall on Jane Citizen')
  })

  it('should join two tagged names with "and"', () => {
    const result = formatLeadNoteSlackMessage({
      ...BASE,
      mentionedNames: ['Glen Marshall', 'Clayton Jenkins'],
    })
    expect(result).toContain('Glen Marshall and Clayton Jenkins')
  })

  it('should join three tagged names with commas and a final "and"', () => {
    const result = formatLeadNoteSlackMessage({
      ...BASE,
      mentionedNames: ['Glen Marshall', 'Clayton Jenkins', 'Vryan Lopez'],
    })
    expect(result).toContain('Glen Marshall, Clayton Jenkins and Vryan Lopez')
  })

  it('should fall back to the plain heading when every tagged name is blank', () => {
    const result = formatLeadNoteSlackMessage({ ...BASE, mentionedNames: ['   '] })
    expect(result.startsWith('📝')).toBe(true)
  })

  it('should not name the same person twice', () => {
    const result = formatLeadNoteSlackMessage({
      ...BASE,
      mentionedNames: ['Glen Marshall', 'glen marshall'],
    })
    expect(result.match(/Glen Marshall/gi)).toHaveLength(1)
  })
})

describe('formatLeadNoteSlackMessage — truncation', () => {
  const long = { ...BASE, body: 'x'.repeat(5000) }

  it('should never exceed the 1000-character Slack cap', () => {
    expect(formatLeadNoteSlackMessage(long).length).toBeLessThanOrEqual(1000)
  })

  it('should keep the whole heading when the body has to be truncated', () => {
    expect(formatLeadNoteSlackMessage(long)).toContain('*New note on Jane Citizen*')
  })

  it('should mark a truncated body with an ellipsis', () => {
    expect(formatLeadNoteSlackMessage(long).endsWith('…')).toBe(true)
  })

  it('should keep the file list when the body has to be truncated', () => {
    const result = formatLeadNoteSlackMessage({ ...long, attachmentNames: ['report.pdf'] })
    expect(result).toContain('📎 report.pdf')
  })

  it('should not truncate a body that already fits', () => {
    expect(formatLeadNoteSlackMessage(BASE)).not.toContain('…')
  })
})

describe('formatLeadNoteSlackMessage — attachments', () => {
  it('should list attachment file names', () => {
    const result = formatLeadNoteSlackMessage({
      ...BASE,
      attachmentNames: ['report.pdf', 'photo.jpg'],
    })
    expect(result).toContain('📎 report.pdf, photo.jpg')
  })

  it('should list at most three attachment names', () => {
    const result = formatLeadNoteSlackMessage({
      ...BASE,
      attachmentNames: ['a.pdf', 'b.pdf', 'c.pdf', 'd.pdf', 'e.pdf'],
    })
    expect(result).toContain('+2 more')
  })

  it('should shorten a file name longer than sixty characters', () => {
    const result = formatLeadNoteSlackMessage({
      ...BASE,
      attachmentNames: [`${'n'.repeat(80)}.pdf`],
    })
    expect(result).toContain(`${'n'.repeat(59)}…`)
  })

  it('should omit the attachment line when nothing was attached', () => {
    expect(formatLeadNoteSlackMessage(BASE)).not.toContain('📎')
  })
})

describe('formatLeadNoteSlackMessage — escaping and fallbacks', () => {
  it('should escape angle brackets so a note body cannot inject a Slack link', () => {
    const result = formatLeadNoteSlackMessage({ ...BASE, body: '<https://evil|click>' })
    expect(result).toContain('&lt;https://evil|click&gt;')
  })

  it('should escape an ampersand in the note body', () => {
    expect(formatLeadNoteSlackMessage({ ...BASE, body: 'Tom & Jerry' })).toContain('Tom &amp; Jerry')
  })

  it('should fall back to "Someone" when the author name is blank', () => {
    expect(formatLeadNoteSlackMessage({ ...BASE, authorName: '  ' })).toContain('— Someone')
  })

  it('should fall back to "this lead" when the lead name is blank', () => {
    expect(formatLeadNoteSlackMessage({ ...BASE, leadName: '' })).toContain('New note on this lead')
  })
})

describe('postLeadNoteToSlack', () => {
  it('should post the formatted message as a custom Slack event', async () => {
    await postLeadNoteToSlack(BASE)
    expect(invokeMock.mock.calls[0][1].body.event).toBe('custom')
  })

  it('should carry the formatted message in the Slack payload', async () => {
    await postLeadNoteToSlack(BASE)
    expect(invokeMock.mock.calls[0][1].body.message).toContain('📝')
  })

  it('should pass the lead id so the post is attributable', async () => {
    await postLeadNoteToSlack(BASE)
    expect(invokeMock.mock.calls[0][1].body.leadId).toBe(LEAD_ID)
  })

  it('should send exactly one Slack post per note', async () => {
    await postLeadNoteToSlack(BASE)
    expect(invokeMock).toHaveBeenCalledTimes(1)
  })

  it('should resolve even when the Slack invoke rejects', async () => {
    invokeMock.mockRejectedValue(new Error('slack down'))
    await expect(postLeadNoteToSlack(BASE)).resolves.toBeUndefined()
  })
})
