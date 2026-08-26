// File attachments on internal lead notes. Backed by public.lead_note_attachments
// and the private `lead-note-attachments` Storage bucket, both applied to PROD
// 2026-08-26. NEVER customer-visible: nothing under supabase/functions, api/ or
// the PDF/email pipelines may import this module.
//
// Upload shape is cloned from public-leads.ts (raw File bytes, dynamic
// contentType, upsert:false) rather than photoUpload.ts, which re-encodes
// everything to JPEG and would destroy a PDF. The rollback discipline is
// photoUpload.ts's: a row insert that fails removes the object it just wrote,
// so a failure never leaves a billable orphan behind.

import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';
import { captureBusinessError } from '@/lib/sentry';

export interface LeadNoteAttachment {
  id: string;
  note_id: string;
  lead_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
  deleted_at: string | null;
}

export type LeadNoteAttachmentErrorCode =
  | 'TOO_LARGE'
  | 'UNKNOWN_TYPE'
  | 'UNSUPPORTED_TYPE'
  | 'NOT_AUTHENTICATED'
  | 'UPLOAD_FAILED'
  | 'INSERT_FAILED'
  | 'LIST_FAILED'
  | 'DELETE_FAILED'
  | 'SIGNED_URL_FAILED';

export class LeadNoteAttachmentError extends Error {
  readonly code: LeadNoteAttachmentErrorCode;

  constructor(code: LeadNoteAttachmentErrorCode, message: string) {
    super(message);
    this.name = 'LeadNoteAttachmentError';
    this.code = code;
  }
}

const ATTACHMENTS_TABLE = 'lead_note_attachments';
const ATTACHMENT_BUCKET = 'lead-note-attachments';
const ATTACHMENT_COLUMNS =
  'id, note_id, lead_id, storage_path, file_name, file_size, mime_type, uploaded_by, created_at, deleted_at';

/** Mirrors storage.buckets.file_size_limit for lead-note-attachments (25 MiB). */
export const MAX_ATTACHMENT_BYTES = 26_214_400;

/** Mirrors storage.buckets.allowed_mime_types. Kept in the same order as the migration. */
export const ALLOWED_ATTACHMENT_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/tiff', 'image/heic', 'image/heif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv', 'text/plain', 'application/rtf',
  'message/rfc822', 'application/vnd.ms-outlook',
  'application/zip', 'application/x-zip-compressed',
  'application/x-7z-compressed',
  'application/vnd.rar', 'application/x-rar-compressed',
];

/** Signed-URL lifetime, matching the report-pdfs document convention. */
const SIGNED_URL_TTL_SECONDS = 300;

const db = supabase as unknown as SupabaseClient;

/** Human-readable size for the feed. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;

  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;

  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

/**
 * Reject a file before any bytes leave the browser.
 *
 * The bucket enforces the same size limit and MIME allowlist server-side, but
 * finding out after a 25 MB upload on field mobile data is a bad experience —
 * and a browser reports an empty file.type for extensions it does not know,
 * which the allowlist rejects with an opaque 400.
 */
export function validateAttachment(file: File): void {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new LeadNoteAttachmentError(
      'TOO_LARGE',
      `"${file.name}" is ${formatFileSize(file.size)} — the limit is ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`,
    );
  }
  if (!file.type) {
    throw new LeadNoteAttachmentError(
      'UNKNOWN_TYPE',
      `Couldn't tell what kind of file "${file.name}" is. Try renaming it with the right extension.`,
    );
  }
  if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type)) {
    throw new LeadNoteAttachmentError(
      'UNSUPPORTED_TYPE',
      `"${file.name}" is a ${file.type} file, which can't be attached.`,
    );
  }
}

export interface UploadNoteAttachmentInput {
  noteId: string;
  leadId: string;
  file: File;
}

/**
 * Upload one file and record it against a note.
 *
 * The object key is `<lead_id>/<note_id>/<uuid>-<name>`; the leading folder is
 * what the storage RLS policies delegate to public.leads through, so it must
 * stay the lead id. If the row insert fails the object is removed again — the
 * failure surfaces as an error and leaves nothing behind.
 */
export async function uploadNoteAttachment(
  input: UploadNoteAttachmentInput,
): Promise<LeadNoteAttachment> {
  const { noteId, leadId, file } = input;
  validateAttachment(file);

  const { data: userData } = await db.auth.getUser();
  const uploadedBy = userData?.user?.id;
  if (!uploadedBy) {
    throw new LeadNoteAttachmentError('NOT_AUTHENTICATED', 'You need to be signed in to attach a file.');
  }

  const storagePath = `${leadId}/${noteId}/${crypto.randomUUID()}-${sanitiseFileName(file.name)}`;

  const { error: uploadError } = await db.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    captureBusinessError('Failed to upload lead note attachment', {
      noteId,
      leadId,
      error: uploadError.message,
    });
    throw new LeadNoteAttachmentError('UPLOAD_FAILED', `Couldn't upload "${file.name}": ${uploadError.message}`);
  }

  const { data, error } = await db
    .from(ATTACHMENTS_TABLE)
    .insert({
      note_id: noteId,
      lead_id: leadId,
      storage_path: storagePath,
      file_name: file.name.slice(0, 255),
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: uploadedBy,
    })
    .select(ATTACHMENT_COLUMNS)
    .single();

  if (error || !data) {
    // Roll the object back so a failed attach never leaves billable bytes that
    // no row references. The storage DELETE policy permits exactly this case.
    await db.storage.from(ATTACHMENT_BUCKET).remove([storagePath]);
    captureBusinessError('Failed to record lead note attachment', {
      noteId,
      leadId,
      error: error?.message ?? 'no row returned',
    });
    throw new LeadNoteAttachmentError(
      'INSERT_FAILED',
      `Couldn't attach "${file.name}": ${error?.message ?? 'no row returned'}`,
    );
  }

  return data as LeadNoteAttachment;
}

/**
 * Live attachments for every note on a lead, grouped by note id. Keyed on
 * lead_id so it runs in parallel with listLeadNotes rather than waterfalling
 * behind it.
 */
export async function listNoteAttachments(leadId: string): Promise<Map<string, LeadNoteAttachment[]>> {
  const byNote = new Map<string, LeadNoteAttachment[]>();

  const { data, error } = await db
    .from(ATTACHMENTS_TABLE)
    .select(ATTACHMENT_COLUMNS)
    .eq('lead_id', leadId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    captureBusinessError('Failed to list lead note attachments', { leadId, error: error.message });
    throw new LeadNoteAttachmentError('LIST_FAILED', `Failed to load attachments: ${error.message}`);
  }

  for (const row of (data ?? []) as LeadNoteAttachment[]) {
    byNote.set(row.note_id, [...(byNote.get(row.note_id) ?? []), row]);
  }
  return byNote;
}

/** Short-lived download URL. The bucket is private; there is no public path. */
export async function getAttachmentSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await db.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    captureBusinessError('Failed to sign lead note attachment URL', {
      storagePath,
      error: error?.message ?? 'no signed url returned',
    });
    throw new LeadNoteAttachmentError(
      'SIGNED_URL_FAILED',
      `Couldn't open that file: ${error?.message ?? 'no signed url returned'}`,
    );
  }
  return data.signedUrl;
}

/**
 * Soft delete (stamps deleted_at). RLS + column privileges mean only the
 * uploader can do this; anyone else, or an already-deleted attachment, matches
 * zero rows and is reported rather than silently succeeding. The stored object
 * is deliberately retained, matching photoUpload.ts.
 */
export async function softDeleteAttachment(attachmentId: string): Promise<void> {
  const { data, error } = await db
    .from(ATTACHMENTS_TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', attachmentId)
    .is('deleted_at', null)
    .select('id');

  if (error) {
    captureBusinessError('Failed to delete lead note attachment', {
      attachmentId,
      error: error.message,
    });
    throw new LeadNoteAttachmentError('DELETE_FAILED', `Failed to remove attachment: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new LeadNoteAttachmentError(
      'DELETE_FAILED',
      'This attachment could not be removed — only the person who uploaded it can.',
    );
  }
}

/**
 * Storage keys allow a narrow character set; the original name is kept intact
 * on the row for display. Deliberately re-implemented rather than imported
 * from public-leads.ts, which is bound to the anon client.
 */
function sanitiseFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}
