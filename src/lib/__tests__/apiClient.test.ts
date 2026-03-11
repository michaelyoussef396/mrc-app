import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies at module level
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockReturnValue(
        Promise.resolve({ data: { user: { id: 'test-user' } } })
      ),
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        then: vi.fn().mockReturnValue({ catch: vi.fn() }),
      }),
    }),
  },
}))

vi.mock('@/lib/sentry', () => ({
  captureBusinessError: vi.fn(),
  addBusinessBreadcrumb: vi.fn(),
}))

import { translateError, supabaseMutation } from '../api/apiClient'

describe('translateError', () => {
  // ── Network errors ──
  it('translates "Failed to fetch" to network message', () => {
    expect(translateError(new Error('Failed to fetch'))).toBe(
      'Unable to connect. Check your internet connection.'
    )
  })

  it('translates "NetworkError" to network message', () => {
    expect(translateError(new Error('NetworkError when attempting to fetch'))).toBe(
      'Unable to connect. Check your internet connection.'
    )
  })

  it('translates "Load failed" to network message', () => {
    expect(translateError(new Error('Load failed'))).toBe(
      'Unable to connect. Check your internet connection.'
    )
  })

  // ── Auth errors ──
  it('translates "JWT expired" to session message', () => {
    expect(translateError(new Error('JWT expired'))).toBe(
      'Your session has expired. Please log in again.'
    )
  })

  it('translates "token is expired" to session message', () => {
    expect(translateError(new Error('token is expired'))).toBe(
      'Your session has expired. Please log in again.'
    )
  })

  // ── Permission errors ──
  it('translates "permission denied" to permission message', () => {
    expect(translateError(new Error('permission denied for table leads'))).toBe(
      "You don't have permission for this action."
    )
  })

  it('translates RLS violation to permission message', () => {
    expect(translateError(new Error('new row violates row-level security policy'))).toBe(
      "You don't have permission for this action."
    )
  })

  // ── Duplicate key ──
  it('translates duplicate key error', () => {
    expect(translateError({ message: 'duplicate key value', code: '23505' })).toBe(
      'This record already exists.'
    )
  })

  it('translates code 23505 to duplicate message', () => {
    expect(translateError({ message: 'unique constraint violation', code: '23505' })).toBe(
      'This record already exists.'
    )
  })

  // ── Foreign key ──
  it('translates foreign key violation', () => {
    expect(translateError({ message: 'foreign key violation', code: '23503' })).toBe(
      'Related data was not found.'
    )
  })

  // ── Rate limiting (429) ──
  it('translates rate limit error', () => {
    expect(translateError(new Error('rate limit exceeded'))).toBe(
      'Too many requests. Please wait before trying again.'
    )
  })

  it('translates 429 code to rate limit message', () => {
    expect(translateError({ message: 'too many requests', code: '429' })).toBe(
      'Too many requests. Please wait before trying again.'
    )
  })

  // ── Service unavailable (502/503) ──
  it('translates 502 bad gateway', () => {
    expect(translateError({ message: 'bad gateway', code: '502' })).toBe(
      'Service temporarily unavailable. Please try again in a few moments.'
    )
  })

  it('translates 503 service unavailable', () => {
    expect(translateError({ message: 'service unavailable', code: '503' })).toBe(
      'Service temporarily unavailable. Please try again in a few moments.'
    )
  })

  // ── Not found (404) ──
  it('translates 404 not found', () => {
    expect(translateError({ message: 'not found', code: '404' })).toBe(
      'The requested item was not found.'
    )
  })

  it('translates PGRST116 to not found', () => {
    expect(translateError({ message: 'JSON object requested', code: 'PGRST116' })).toBe(
      'The requested item was not found.'
    )
  })

  // ── Bad request (400) ──
  it('translates 400 bad request', () => {
    expect(translateError({ message: 'bad request', code: '400' })).toBe(
      'Invalid data. Please check your input and try again.'
    )
  })

  it('translates "invalid input" to bad request message', () => {
    expect(translateError(new Error('invalid input syntax'))).toBe(
      'Invalid data. Please check your input and try again.'
    )
  })

  // ── Default fallback ──
  it('returns default message with support number for unknown errors', () => {
    expect(translateError(new Error('some random error'))).toBe(
      'Something went wrong. Please try again or call 1800 954 117.'
    )
  })

  it('handles string errors', () => {
    expect(translateError('plain string error')).toBe(
      'Something went wrong. Please try again or call 1800 954 117.'
    )
  })

  it('handles null/undefined gracefully', () => {
    expect(translateError(null)).toBe(
      'Something went wrong. Please try again or call 1800 954 117.'
    )
  })
})

describe('supabaseMutation', () => {
  let originalOnLine: boolean

  beforeEach(() => {
    originalOnLine = navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, writable: true })
  })

  it('returns offline error when navigator is offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

    const result = await supabaseMutation(
      async () => ({ data: null, error: null }),
      { action: 'test' }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('offline')
  })

  it('returns translated error on Supabase error', async () => {
    const result = await supabaseMutation(
      async () => ({
        data: null,
        error: { message: 'duplicate key value violates unique constraint', code: '23505' },
      }),
      { action: 'create_lead', entityType: 'lead' }
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('This record already exists.')
  })

  it('returns success with data on success', async () => {
    const mockData = { id: '123', name: 'Test' }
    const result = await supabaseMutation(
      async () => ({ data: mockData, error: null }),
      { action: 'test_action' }
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual(mockData)
  })

  it('catches thrown exceptions and returns translated message', async () => {
    const result = await supabaseMutation(
      async () => { throw new Error('Failed to fetch') },
      { action: 'test_action' }
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unable to connect. Check your internet connection.')
  })
})
