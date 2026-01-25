/**
 * Client-side rate limiting for login attempts
 *
 * Prevents brute force attacks by tracking failed login attempts
 * and locking out users after too many failures.
 *
 * Settings:
 * - Max attempts: 5 per 15-minute window
 * - Lockout duration: 30 minutes
 */

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const STORAGE_KEY = 'mrc_login_attempts';
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes lockout

/**
 * Get current login attempt data from localStorage
 */
export function getLoginAttempts(): LoginAttempt {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { count: 0, firstAttempt: 0, lockedUntil: null };
  }
  try {
    return JSON.parse(stored);
  } catch {
    return { count: 0, firstAttempt: 0, lockedUntil: null };
  }
}

/**
 * Record a failed login attempt
 * Returns the updated attempt data
 */
export function recordFailedAttempt(): LoginAttempt {
  const now = Date.now();
  let attempts = getLoginAttempts();

  // Reset if window expired and not currently locked
  if (!attempts.lockedUntil && now - attempts.firstAttempt > WINDOW_MS) {
    attempts = { count: 0, firstAttempt: now, lockedUntil: null };
  }

  // First attempt in window
  if (attempts.count === 0) {
    attempts.firstAttempt = now;
  }

  attempts.count++;

  // Lock account if max attempts reached
  if (attempts.count >= MAX_ATTEMPTS) {
    attempts.lockedUntil = now + LOCKOUT_MS;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  return attempts;
}

/**
 * Clear all login attempt tracking (call on successful login)
 */
export function clearLoginAttempts(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if the user is currently locked out
 * Returns locked status and remaining lockout time in milliseconds
 */
export function isLockedOut(): { locked: boolean; remainingMs: number } {
  const attempts = getLoginAttempts();
  const now = Date.now();

  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    return { locked: true, remainingMs: attempts.lockedUntil - now };
  }

  // Clear if lockout expired
  if (attempts.lockedUntil && now >= attempts.lockedUntil) {
    clearLoginAttempts();
  }

  return { locked: false, remainingMs: 0 };
}

/**
 * Get the number of remaining login attempts before lockout
 */
export function getRemainingAttempts(): number {
  const attempts = getLoginAttempts();
  const now = Date.now();

  // Reset count if window expired and not locked
  if (!attempts.lockedUntil && now - attempts.firstAttempt > WINDOW_MS) {
    return MAX_ATTEMPTS;
  }

  return Math.max(0, MAX_ATTEMPTS - attempts.count);
}

/**
 * Format remaining lockout time for display
 */
export function formatLockoutTime(remainingMs: number): string {
  const minutes = Math.ceil(remainingMs / 60000);
  if (minutes === 1) {
    return '1 minute';
  }
  return `${minutes} minutes`;
}
