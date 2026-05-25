// Deno mirror of src/lib/utils/reportHash.ts. Keep these two files in sync —
// the new pipeline depends on the EF and the Vercel renderer producing the
// IDENTICAL hash for the same input. The implementation uses Web Crypto so
// both Node (Vercel) and Deno (Supabase EFs) get bit-identical output.

const SUPABASE_STORAGE_URL_RE =
  /(https?:\/\/[^/\s"']+\/storage\/v1\/object\/(?:sign|public)\/[^?"'\s]+)\?[^"'\s]*/g;

export function normalizeHtmlForHash(html: string): string {
  return html.replace(SUPABASE_STORAGE_URL_RE, '$1');
}

export async function hashHtml(html: string): Promise<string> {
  const normalized = normalizeHtmlForHash(html);
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
