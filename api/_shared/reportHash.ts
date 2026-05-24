// Node mirror of src/lib/utils/reportHash.ts and supabase/functions/_shared/reportHash.ts.
// Three identical copies are required because Vercel (Node), Supabase EFs
// (Deno) and Vite (browser) each bundle their own runtime. The implementation
// uses Web Crypto so all three produce bit-identical output for the same
// input. KEEP THESE THREE FILES IN PERFECT SYNC.

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
