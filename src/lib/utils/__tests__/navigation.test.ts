import { describe, expect, it } from 'vitest';

import { isInternalPath } from '@/lib/utils/navigation';

describe('isInternalPath', () => {
  it('should accept a single-slash internal path', () => {
    expect(isInternalPath('/leads/abc-123')).toBe(true);
  });

  it('should accept an internal path with query string', () => {
    expect(isInternalPath('/admin/leads?filter=new')).toBe(true);
  });

  it('should reject a protocol-relative URL', () => {
    expect(isInternalPath('//evil.example.com/admin')).toBe(false);
  });

  it('should reject an absolute https URL', () => {
    expect(isInternalPath('https://evil.example.com/login')).toBe(false);
  });

  it('should reject a javascript scheme', () => {
    expect(isInternalPath('javascript:alert(1)')).toBe(false);
  });

  it('should reject the backslash normalization trick', () => {
    expect(isInternalPath('/\\evil.example.com')).toBe(false);
  });

  it('should reject an empty string', () => {
    expect(isInternalPath('')).toBe(false);
  });

  it('should reject a relative path without leading slash', () => {
    expect(isInternalPath('leads/abc-123')).toBe(false);
  });

  it('should reject a newline smuggled after the leading slash', () => {
    expect(isInternalPath('/\n/evil.example.com')).toBe(false);
  });

  it('should reject a tab smuggled after the leading slash', () => {
    expect(isInternalPath('/\t/evil.example.com')).toBe(false);
  });

  it('should reject a carriage return smuggled after the leading slash', () => {
    expect(isInternalPath('/\r/evil.example.com')).toBe(false);
  });

  it('should reject a control character anywhere in the path', () => {
    expect(isInternalPath('/leads/abc\x07123')).toBe(false);
  });
});
