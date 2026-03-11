import { supabase } from '@/integrations/supabase/client'
import { captureBusinessError, addBusinessBreadcrumb } from '@/lib/sentry'

// ============================================================================
// TYPES
// ============================================================================

export interface MutationResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// ERROR TRANSLATION
// ============================================================================

const ERROR_MAP: Array<{ patterns: string[]; message: string }> = [
  {
    patterns: ['Failed to fetch', 'NetworkError', 'Load failed', 'net::ERR_'],
    message: 'Unable to connect. Check your internet connection.',
  },
  {
    patterns: ['JWT expired', 'invalid claim', 'token is expired'],
    message: 'Your session has expired. Please log in again.',
  },
  {
    patterns: ['permission denied', 'new row violates row-level security', 'row-level security'],
    message: "You don't have permission for this action.",
  },
  {
    patterns: ['duplicate key', '23505'],
    message: 'This record already exists.',
  },
  {
    patterns: ['foreign key violation', '23503'],
    message: 'Related data was not found.',
  },
  {
    patterns: ['rate limit', '429', 'too many requests'],
    message: 'Too many requests. Please wait before trying again.',
  },
  {
    patterns: ['bad gateway', '502'],
    message: 'Service temporarily unavailable. Please try again in a few moments.',
  },
  {
    patterns: ['service unavailable', '503'],
    message: 'Service temporarily unavailable. Please try again in a few moments.',
  },
  {
    patterns: ['not found', '404', 'PGRST116'],
    message: 'The requested item was not found.',
  },
  {
    patterns: ['bad request', '400', 'invalid input'],
    message: 'Invalid data. Please check your input and try again.',
  },
]

const DEFAULT_ERROR = 'Something went wrong. Please try again or call 1800 954 117.'

export function translateError(error: unknown): string {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error)

  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : ''

  const searchStr = `${message} ${code}`.toLowerCase()

  for (const entry of ERROR_MAP) {
    if (entry.patterns.some(p => searchStr.includes(p.toLowerCase()))) {
      return entry.message
    }
  }

  return DEFAULT_ERROR
}

// ============================================================================
// CENTRALIZED MUTATION WRAPPER
// ============================================================================

/**
 * Wrap any async Supabase mutation with:
 * - Online check
 * - Sentry error capture
 * - User-friendly error translation
 * - Fire-and-forget error_logs insert
 *
 * Usage:
 *   const result = await supabaseMutation(
 *     () => supabase.from('leads').update({ status: 'new' }).eq('id', leadId),
 *     { action: 'update_lead_status', entityType: 'lead', entityId: leadId }
 *   );
 *   if (!result.success) toast.error(result.error);
 */
export async function supabaseMutation<T = unknown>(
  mutationFn: () => Promise<{ data: T; error: any }>,
  context: {
    action: string
    entityType?: string
    entityId?: string
  }
): Promise<MutationResult<T>> {
  // 1. Online check
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      error: 'You appear to be offline. Please check your connection and try again.',
    }
  }

  addBusinessBreadcrumb(`Mutation: ${context.action}`, {
    entityType: context.entityType,
    entityId: context.entityId,
  })

  try {
    const { data, error } = await mutationFn()

    if (error) {
      const userMessage = translateError(error)

      captureBusinessError(`Mutation failed: ${context.action}`, {
        ...context,
        supabaseError: error.message,
        supabaseCode: error.code,
      })

      // Fire-and-forget: log to error_logs table
      logToErrorTable('api_error', error.message, context)

      return { success: false, error: userMessage }
    }

    return { success: true, data: data as T }
  } catch (err) {
    const userMessage = translateError(err)

    captureBusinessError(`Mutation exception: ${context.action}`, {
      ...context,
      error: err instanceof Error ? err.message : String(err),
    })

    logToErrorTable(
      'client_error',
      err instanceof Error ? err.message : String(err),
      context,
      err instanceof Error ? err.stack : undefined
    )

    return { success: false, error: userMessage }
  }
}

// ============================================================================
// ERROR LOG TABLE (fire-and-forget)
// ============================================================================

function logToErrorTable(
  errorType: string,
  message: string,
  context: Record<string, unknown>,
  stackTrace?: string
) {
  supabase.auth.getUser().then(({ data: { user } }) => {
    supabase
      .from('error_logs')
      .insert({
        error_type: errorType,
        severity: 'error',
        message,
        stack_trace: stackTrace || null,
        context: {
          route: typeof window !== 'undefined' ? window.location.pathname : null,
          ...context,
        },
        source: 'client',
        user_id: user?.id || null,
      })
      .then(() => {})
      .catch(() => {})
      // Silently fail — this is non-blocking
  }).catch(() => {})
}
