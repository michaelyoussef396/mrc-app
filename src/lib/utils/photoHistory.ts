// Phase 4 Stage 4.2 — photo_history helper.
//
// Domain-level history of meaningful photo lifecycle events. Coexists with
// audit_logs (raw row before/after via triggers on photos) — same separation
// pattern as activities vs audit_logs.
//
// Application-layer writes only (no trigger). Failure is non-blocking: we
// log via Sentry and continue, so a history insert failure NEVER blocks the
// user-facing photo operation. Mirrors the audit_logs / Sentry resilience
// pattern already used by photoUpload.ts.

import { supabase } from '@/integrations/supabase/client'
import { captureBusinessError } from '@/lib/sentry'

/**
 * The full action enum matches the CHECK constraint on public.photo_history.
 * Wired callers today (PR-G): 'added', 'category_changed'.
 * Reserved for future stages: 'deleted' (4.3), 'caption_changed', 'reordered',
 * 'reattached' (4.5+).
 */
export type PhotoHistoryAction =
  | 'added'
  | 'deleted'
  | 'caption_changed'
  | 'reordered'
  | 'reattached'
  | 'category_changed'

export interface RecordPhotoHistoryArgs {
  photo_id: string
  inspection_id: string
  action: PhotoHistoryAction
  /** Minimal JSONB capturing only the fields that changed. Omit on 'added'. */
  before?: Record<string, unknown> | null
  /** Minimal JSONB capturing only the fields that changed. */
  after?: Record<string, unknown> | null
}

/**
 * Insert a photo_history row. Non-blocking — never throws. If the insert
 * fails (RLS, network, malformed), the error is captured via Sentry and the
 * function resolves silently so the calling photo operation continues.
 *
 * changed_by is set from the authenticated session's auth.uid(); if there
 * is no session (which shouldn't happen for any legitimate caller) the row
 * is skipped entirely rather than written with a NULL changed_by.
 */
export async function recordPhotoHistory(args: RecordPhotoHistoryArgs): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // No authenticated session — skip silently. Logged so we can spot it
      // if it ever happens in production.
      captureBusinessError('photo_history insert skipped: no authenticated user', {
        photo_id: args.photo_id,
        action: args.action,
      })
      return
    }

    const { error } = await supabase
      .from('photo_history')
      .insert({
        photo_id: args.photo_id,
        inspection_id: args.inspection_id,
        action: args.action,
        before: (args.before as never) ?? null,
        after: (args.after as never) ?? null,
        changed_by: user.id,
      })

    if (error) {
      captureBusinessError('photo_history insert failed', {
        photo_id: args.photo_id,
        inspection_id: args.inspection_id,
        action: args.action,
        error: error.message,
      })
    }
  } catch (err) {
    captureBusinessError('photo_history insert threw', {
      photo_id: args.photo_id,
      action: args.action,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
