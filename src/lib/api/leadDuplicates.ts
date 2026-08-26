/**
 * Duplicate-lead lookup for the admin Create New Lead form.
 *
 * Advisory only: the schema has no unique constraint on phone or email, and
 * PROD already holds legitimate duplicates (repeat customers, shared numbers).
 * Callers surface the match as a warning and still allow the insert.
 * Archived leads are ignored — re-enquiries after archive are normal.
 */

import { supabase } from '@/integrations/supabase/client';

export type DuplicateMatchType = 'phone number' | 'email address';

export interface DuplicateLeadMatch {
  id: string;
  fullName: string;
  matchType: DuplicateMatchType;
}

export interface DuplicateLeadLookup {
  phone: string;
  email: string;
}

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export async function findDuplicateLead({ phone, email }: DuplicateLeadLookup): Promise<DuplicateLeadMatch | null> {
  const phoneDigits = normalizePhoneDigits(phone);
  const emailLower = email.toLowerCase().trim();
  if (!phoneDigits && !emailLower) return null;

  const conditions = [
    phoneDigits ? `phone.eq.${phoneDigits}` : null,
    emailLower ? `email.ilike.${emailLower}` : null,
  ].filter((condition): condition is string => condition !== null);

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id, full_name, phone, email')
      .is('archived_at', null)
      .or(conditions.join(','))
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const existing = data[0];
    return {
      id: existing.id,
      fullName: existing.full_name,
      matchType: existing.phone === phoneDigits ? 'phone number' : 'email address',
    };
  } catch {
    return null;
  }
}
