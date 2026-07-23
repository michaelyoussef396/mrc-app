/**
 * Public lead capture API — used by the anonymous /request-inspection form.
 *
 * Leads are NOT inserted directly from the browser. The form POSTs to the
 * receive-framer-lead Edge Function, which owns rate-limiting, audit
 * attribution (audited_insert_lead_via_framer RPC), duplicate detection, the
 * confirmation email, and the Slack alert. This keeps the leads table free of
 * any public/anon INSERT policy.
 *
 * Photos upload separately, directly to Storage with the anon client.
 *
 * NOTE: Bucket 'lead-enquiry-photos' must be created manually in Supabase Studio
 * with public=false and an INSERT policy for the anon role. Admin SELECT only.
 * Because the bucket is private we store object PATHS in leads.initial_photos
 * (not public URLs); admin surfaces view them via short-lived signed URLs.
 */

import { supabase } from '@/integrations/supabase/client';

import type { RequestInspectionSchemaType } from '@/lib/validators/lead-creation.schemas';

const LEAD_PHOTO_BUCKET = 'lead-enquiry-photos';
const EDGE_FUNCTION_NAME = 'receive-framer-lead';

/** Thrown when the lead submission to the Edge Function fails. */
export class LeadSubmissionError extends Error {
  constructor(
    message: string,
    readonly code: 'rate_limited' | 'validation' | 'network' | 'server',
  ) {
    super(message);
    this.name = 'LeadSubmissionError';
  }
}

export interface PhotoUploadResult {
  /** Storage object paths for successfully uploaded files. */
  paths: string[];
  /** Names of files that failed to upload (non-blocking). */
  failed: string[];
}

/** Strip characters that don't belong in a Storage object key. */
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Upload enquiry photos to the private lead-enquiry-photos bucket.
 *
 * Per-file failures are collected, never thrown — a partial set of photos
 * should never block the lead itself from being captured.
 */
export async function uploadLeadPhotos(files: File[]): Promise<PhotoUploadResult> {
  const paths: string[] = [];
  const failed: string[] = [];

  for (const file of files) {
    const objectPath = `leads/${Date.now()}_${sanitizeFileName(file.name)}`;
    const { data, error } = await supabase.storage
      .from(LEAD_PHOTO_BUCKET)
      .upload(objectPath, file, { contentType: file.type, upsert: false });

    if (error || !data) {
      console.warn(`[public-leads] photo upload failed for "${file.name}":`, error?.message);
      failed.push(file.name);
      continue;
    }
    paths.push(data.path);
  }

  return { paths, failed };
}

/** Payload shape the receive-framer-lead Edge Function reads (snake_case keys). */
interface LeadSubmissionPayload {
  full_name: string;
  phone: string;
  email: string;
  property_address: string;
  suburb: string;
  preferred_day: string;
  preferred_time: string;
  issue_type: string;
  urgency: string;
  property_type: string;
  issue_description?: string;
  initial_photos?: string[];
}

/**
 * Submit a public lead to the receive-framer-lead Edge Function.
 *
 * @throws LeadSubmissionError on a non-2xx response or network failure.
 */
export async function submitPublicLead(
  form: RequestInspectionSchemaType,
  photoPaths: string[],
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new LeadSubmissionError('Submission is not configured. Please call 1800 954 117.', 'server');
  }

  const payload: LeadSubmissionPayload = {
    full_name: form.full_name,
    phone: form.phone,
    email: form.email,
    // EF maps property_address → property_address_street (see getField aliases).
    property_address: form.property_address,
    suburb: form.suburb,
    preferred_day: form.preferred_day,
    preferred_time: form.preferred_time,
    issue_type: form.issue_type,
    urgency: form.urgency,
    property_type: form.property_type,
    issue_description: form.issue_description || undefined,
    initial_photos: photoPaths.length > 0 ? photoPaths : undefined,
  };

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/${EDGE_FUNCTION_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new LeadSubmissionError('Network error. Please check your connection and try again.', 'network');
  }

  if (response.ok) return;

  if (response.status === 429) {
    throw new LeadSubmissionError('Too many submissions. Please try again later or call 1800 954 117.', 'rate_limited');
  }
  if (response.status === 400) {
    throw new LeadSubmissionError('Some details look invalid. Please review the form and try again.', 'validation');
  }
  throw new LeadSubmissionError('Something went wrong saving your enquiry. Please call us at 1800 954 117.', 'server');
}
