/**
 * Guard for navigating values stored in the database (CWE-601 stored open
 * redirect). notifications.action_url is writable by any authenticated user,
 * and react-router's useNavigate falls back to window.location.assign for
 * cross-origin values - so only same-app absolute paths may ever be navigated.
 * Accepts "/path" only; rejects schemes ("https:", "javascript:"),
 * protocol-relative "//host", and the legacy "/\host" normalization trick.
 *
 * Control characters are rejected outright: the WHATWG URL parser strips
 * TAB/CR/LF before resolving, so a stored "/<LF>/evil.com" would otherwise
 * pass the prefix check and then collapse to "//evil.com" cross-origin at
 * navigation time.
 */
const ASCII_CONTROL_CHARS = /[\x00-\x1f\x7f]/;
const SINGLE_LEADING_SLASH = /^\/(?![/\\])/;

export function isInternalPath(url: string): boolean {
  if (ASCII_CONTROL_CHARS.test(url)) return false;
  return SINGLE_LEADING_SLASH.test(url);
}
