import { describe, it, expect } from 'vitest';
import { hashHtml, normalizeHtmlForHash } from './reportHash';

const TEMPLATE = (token: string) => `
<html>
<body>
  <h1>Inspection Report</h1>
  <img src="https://example-ref.supabase.co/storage/v1/object/sign/inspection-photos/abc/cover.jpg?token=${token}&expires=1715000000" alt="cover">
  <p>Customer: Alice Example</p>
</body>
</html>
`.trim();

describe('normalizeHtmlForHash', () => {
  it('strips token + expires query string from signed supabase storage URLs', () => {
    const input = TEMPLATE('VOLATILE_TOKEN_001');
    const normalized = normalizeHtmlForHash(input);
    expect(normalized).not.toContain('?token=');
    expect(normalized).not.toContain('expires=');
    expect(normalized).toContain('/storage/v1/object/sign/inspection-photos/abc/cover.jpg');
  });

  it('leaves non-supabase URLs untouched', () => {
    const input = `<a href="https://example.com/page?foo=bar">link</a>`;
    expect(normalizeHtmlForHash(input)).toBe(input);
  });

  it('strips query strings from public storage URLs too', () => {
    const input = `<img src="https://x.supabase.co/storage/v1/object/public/pdf-templates/foo.html?x=1">`;
    const normalized = normalizeHtmlForHash(input);
    expect(normalized).toBe(`<img src="https://x.supabase.co/storage/v1/object/public/pdf-templates/foo.html">`);
  });

  it('handles HTML with no storage URLs', () => {
    const input = `<p>plain text</p>`;
    expect(normalizeHtmlForHash(input)).toBe(input);
  });
});

describe('hashHtml', () => {
  it('returns a 64-char hex SHA-256 digest', async () => {
    const hash = await hashHtml('<p>hello</p>');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', async () => {
    const html = '<p>same content</p>';
    expect(await hashHtml(html)).toBe(await hashHtml(html));
  });

  it('produces identical hashes for HTML differing only in signed-URL tokens', async () => {
    const callA = TEMPLATE('TOKEN_AAA');
    const callB = TEMPLATE('TOKEN_BBB_with_different_chars_999');
    expect(callA).not.toBe(callB);
    expect(await hashHtml(callA)).toBe(await hashHtml(callB));
  });

  it('produces different hashes when a non-volatile field changes', async () => {
    const base = TEMPLATE('TOKEN_X');
    const changed = base.replace('Alice Example', 'Bob Different');
    expect(await hashHtml(base)).not.toBe(await hashHtml(changed));
  });

  it('produces different hashes when an inspection photo path changes', async () => {
    const base = TEMPLATE('TOKEN_X');
    const changed = base.replace('cover.jpg', 'replacement-cover.jpg');
    expect(await hashHtml(base)).not.toBe(await hashHtml(changed));
  });

  it('handles empty string input', async () => {
    const hash = await hashHtml('');
    // SHA-256 of the empty string is a known constant.
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});
